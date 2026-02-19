import { Contract, BillingPeriod, InvoiceDay, QuarterlyMonths, QUARTERLY_MONTHS_MAP } from '@/types/contracts';

/**
 * Calculate the next invoice date for a contract based on billing period logic
 */
export function calculateNextInvoiceDate(
  billingPeriod: BillingPeriod,
  invoiceDay: InvoiceDay,
  quarterlyMonths?: QuarterlyMonths,
  startDate?: string,
  lastInvoiceDate?: string,
  referenceDate: Date = new Date(),
  includePastDays: boolean = false
): string | null {
  const today = referenceDate;
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // 1-indexed
  const currentDay = today.getDate();

  // Get the list of months this contract bills in
  const billingMonths = getBillingMonths(billingPeriod, quarterlyMonths);

  // Find the next billing date
  for (let monthOffset = 0; monthOffset <= 24; monthOffset++) {
    const targetMonth = ((currentMonth - 1 + monthOffset) % 12) + 1;
    const targetYear = currentYear + Math.floor((currentMonth - 1 + monthOffset) / 12);

    // Check if this is a billing month
    if (!billingMonths.includes(targetMonth)) continue;

    // Create the invoice date
    const invoiceDate = new Date(targetYear, targetMonth - 1, invoiceDay);

    // Skip if date is in the past (unless it's this month and after invoice day, AND we aren't fetching for areport)
    if (!includePastDays && monthOffset === 0 && currentDay > invoiceDay) continue;

    // Check if contract start date affects this
    if (startDate) {
      // Use helper to parse YYYY-MM-DD to local 00:00:00 to match invoiceDate
      const start = parseLocalDate(startDate);
      // If invoice date is before start date, skip
      if (invoiceDate < start) continue;

      // If contract starts mid-period after invoice day, defer to next billing month
      if (start.getMonth() + 1 === targetMonth &&
        start.getFullYear() === targetYear &&
        start.getDate() > invoiceDay) {
        continue;
      }
    }

    return invoiceDate.toISOString().split('T')[0];
  }

  return null;
}

/**
 * Helper: Parse YYYY-MM-DD string to local Date at 00:00:00
 * Handles timezone issues where new Date("YYYY-MM-DD") creates UTC midnight (often previous day local)
 */
function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Get the months in which a contract should be invoiced
 */
function getBillingMonths(billingPeriod: BillingPeriod, quarterlyMonths?: QuarterlyMonths): number[] {
  // Month name to number mapping
  const monthNameMap: Record<string, number> = {
    'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
    'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12,
  };

  // Helper: extract month numbers from any schedule string (e.g., "FEB-MAY-AUG-NOV" → [2,5,8,11])
  const extractMonths = (schedule: string): number[] => {
    return schedule.split('-').map(p => monthNameMap[p.trim().toUpperCase()]).filter(m => m !== undefined);
  };

  switch (billingPeriod) {
    case 'MB':
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; // Every month

    case 'MBYX':
    case 'MBQX':
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; // Every month (monthly component)

    case 'QB':
    case 'QBYX': {
      // Parse quarterly schedule
      const quarterlyMap: Record<string, number[]> = {
        'JAN-APR-JUL-OCT': [1, 4, 7, 10],
        'FEB-MAY-AUG-NOV': [2, 5, 8, 11],
        'MAR-JUN-SEP-DEC': [3, 6, 9, 12],
      };
      return quarterlyMap[quarterlyMonths || ''] || [2, 5, 8, 11]; // Default: FEB-MAY-AUG-NOV
    }

    case 'HY': {
      // Parse half-yearly schedule - supports both proper "JAN-JUL" and imported quarterly formats
      const hyMap: Record<string, number[]> = {
        'JAN-JUL': [1, 7],
        'FEB-AUG': [2, 8],
        'MAR-SEP': [3, 9],
        'APR-OCT': [4, 10],
        'MAY-NOV': [5, 11],
        'JUN-DEC': [6, 12],
      };
      if (quarterlyMonths && hyMap[quarterlyMonths]) {
        return hyMap[quarterlyMonths];
      }
      // Handle imported quarterly format like "FEB-MAY-AUG-NOV" → extract first month + 6-month pair
      if (quarterlyMonths) {
        const extracted = extractMonths(quarterlyMonths);
        if (extracted.length >= 1) {
          const first = extracted[0];
          const second = first <= 6 ? first + 6 : first - 6;
          return [first, second].sort((a, b) => a - b);
        }
      }
      return [1, 7]; // Default: JAN-JUL
    }

    case 'YB': {
      // Parse yearly month - supports both single "JAN" and imported quarterly "FEB-MAY-AUG-NOV"
      if (quarterlyMonths) {
        if (monthNameMap[quarterlyMonths]) {
          return [monthNameMap[quarterlyMonths]];
        }
        // Handle imported quarterly format → extract first month
        const extracted = extractMonths(quarterlyMonths);
        if (extracted.length > 0) {
          return [extracted[0]];
        }
      }
      return [1]; // Default: January
    }

    case '2MBX':
      // Parse bi-monthly cycle
      if (quarterlyMonths === 'FEB-APR-JUN-AUG-OCT-DEC') {
        return [2, 4, 6, 8, 10, 12]; // Even months
      }
      return [1, 3, 5, 7, 9, 11]; // Odd months (default)

    default:
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  }
}

/**
 * Check if a contract is due for invoicing in a given month
 * Implements "next occurrence" rule: if a contract starts in or after a billing month,
 * it defers to the NEXT occurrence of that billing period
 */
export function isDueInMonth(contract: Contract, month: number, year: number): boolean {
  if (contract.status !== 'active') return false;

  const billingMonths = getBillingMonths(contract.billingPeriod, contract.quarterlyMonths);
  if (!billingMonths.includes(month)) return false;

  const invoiceDate = new Date(year, month - 1, contract.invoiceDay);

  // Check start date - implement "next occurrence" rule
  if (contract.startDate && contract.startDate.trim() !== '') {
    // Use helper to parse YYYY-MM-DD to local 00:00:00
    const start = parseLocalDate(contract.startDate);

    // Guard against invalid dates (e.g. new Date(undefined))
    if (!isNaN(start.getTime())) {
      // If invoice date is before contract start, skip
      if (invoiceDate < start) return false;

      // "Next occurrence" rule: If contract started in this billing month 
      // but after the invoice day, defer to next billing cycle
      if (start.getMonth() + 1 === month &&
        start.getFullYear() === year &&
        start.getDate() > contract.invoiceDay) {
        return false;
      }
    }
  }

  // Check end/pullout date
  if (contract.endDate) {
    const end = parseLocalDate(contract.endDate);
    if (invoiceDate > end) return false;
  }

  if (contract.pulloutDate) {
    const pullout = parseLocalDate(contract.pulloutDate);
    if (invoiceDate > pullout) return false;
  }

  return true;
}

/**
 * Get contracts due this month grouped by invoice day
 */
export function getContractsDueThisMonth(contracts: Contract[], referenceDate: Date = new Date()): {
  day5: Contract[];
  day15: Contract[];
  day25: Contract[];
  all: Contract[];
} {
  const month = referenceDate.getMonth() + 1;
  const year = referenceDate.getFullYear();

  const dueContracts = contracts.filter(c => isDueInMonth(c, month, year));

  return {
    day5: dueContracts.filter(c => Number(c.invoiceDay) === 5),
    day15: dueContracts.filter(c => Number(c.invoiceDay) === 15),
    day25: dueContracts.filter(c => Number(c.invoiceDay) === 25),
    all: dueContracts,
  };
}

/**
 * Update next invoice date for a contract
 */
export function updateContractNextInvoiceDate(contract: Contract): string | null {
  return calculateNextInvoiceDate(
    contract.billingPeriod,
    contract.invoiceDay,
    contract.quarterlyMonths,
    contract.startDate,
    contract.lastInvoiceDate
  );
}

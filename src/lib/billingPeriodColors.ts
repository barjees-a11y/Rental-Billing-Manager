import { BillingPeriod } from '@/types/contracts';

/**
 * Distinct colors for each billing period type
 * Colors designed for good visibility in both UI and Excel
 */
export const BILLING_PERIOD_COLORS: Record<BillingPeriod, { 
  bg: string; 
  text: string; 
  excelBg: string;
  excelText: string;
  name: string;
}> = {
  'MB': { 
    bg: 'bg-blue-500/20', 
    text: 'text-blue-600 dark:text-blue-400', 
    excelBg: '4472C4',  // Blue
    excelText: 'FFFFFF',
    name: 'Monthly'
  },
  'QB': { 
    bg: 'bg-green-500/20', 
    text: 'text-green-600 dark:text-green-400', 
    excelBg: '70AD47',  // Green
    excelText: 'FFFFFF',
    name: 'Quarterly'
  },
  'MBQX': { 
    bg: 'bg-purple-500/20', 
    text: 'text-purple-600 dark:text-purple-400', 
    excelBg: '7030A0',  // Purple
    excelText: 'FFFFFF',
    name: 'Monthly + Quarterly'
  },
  'QBYX': { 
    bg: 'bg-orange-500/20', 
    text: 'text-orange-600 dark:text-orange-400', 
    excelBg: 'ED7D31',  // Orange
    excelText: 'FFFFFF',
    name: 'Quarterly + Yearly'
  },
  'YB': { 
    bg: 'bg-red-500/20', 
    text: 'text-red-600 dark:text-red-400', 
    excelBg: 'C00000',  // Red
    excelText: 'FFFFFF',
    name: 'Yearly'
  },
  'HY': { 
    bg: 'bg-teal-500/20', 
    text: 'text-teal-600 dark:text-teal-400', 
    excelBg: '00B0F0',  // Cyan
    excelText: 'FFFFFF',
    name: 'Half-Yearly'
  },
  '2MBX': { 
    bg: 'bg-pink-500/20', 
    text: 'text-pink-600 dark:text-pink-400', 
    excelBg: 'FF66CC',  // Pink
    excelText: 'FFFFFF',
    name: 'Bi-Monthly'
  },
  'MBYX': { 
    bg: 'bg-amber-500/20', 
    text: 'text-amber-600 dark:text-amber-400', 
    excelBg: 'FFC000',  // Gold
    excelText: '000000',
    name: 'Monthly + Yearly'
  },
};

/**
 * Get month marker (X or empty) based on contract billing period and quarterly months
 */
export function getMonthMarker(
  billingPeriod: BillingPeriod,
  quarterlyMonths: string | undefined,
  month: number // 1-12
): string {
  // Monthly billing - all months active
  if (billingPeriod === 'MB' || billingPeriod === 'MBYX' || billingPeriod === 'MBQX') {
    return 'X';
  }

  // Bi-monthly - every other month (odd months: Jan, Mar, May, etc.)
  if (billingPeriod === '2MBX') {
    return month % 2 === 1 ? 'X' : '';
  }

  // Half-yearly - Jan and Jul
  if (billingPeriod === 'HY') {
    return (month === 1 || month === 7) ? 'X' : '';
  }

  // Yearly - Jan only
  if (billingPeriod === 'YB') {
    return month === 1 ? 'X' : '';
  }

  // Quarterly billing - check quarterly months schedule
  if (billingPeriod === 'QB' || billingPeriod === 'QBYX') {
    if (quarterlyMonths) {
      const monthMap: Record<string, number[]> = {
        'JAN-APR-JUL-OCT': [1, 4, 7, 10],
        'FEB-MAY-AUG-NOV': [2, 5, 8, 11],
        'MAR-JUN-SEP-DEC': [3, 6, 9, 12],
      };
      const billingMonths = monthMap[quarterlyMonths] || [];
      return billingMonths.includes(month) ? 'X' : '';
    }
    return '';
  }

  return '';
}

/**
 * Month names for headers
 */
export const MONTH_NAMES = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
];

/**
 * Quarter groupings
 */
export const QUARTER_GROUPS = [
  { label: 'Q1', months: [1, 2, 3], names: ['JAN', 'FEB', 'MAR'] },
  { label: 'Q2', months: [4, 5, 6], names: ['APR', 'MAY', 'JUN'] },
  { label: 'Q3', months: [7, 8, 9], names: ['JUL', 'AUG', 'SEP'] },
  { label: 'Q4', months: [10, 11, 12], names: ['OCT', 'NOV', 'DEC'] },
];

/**
 * Quarter definition type for display purposes
 */
export interface QuarterDefinition {
  label: string;
  months: number[];
  names: string[];
}

/**
 * Get the billing month to display in a quarter column.
 * Uses the schedule selection (quarterlyMonths) to determine display for each period type.
 */
/**
 * Extract billing months from any schedule format based on period type.
 * Handles both proper schedules and imported quarterly schedules for non-quarterly periods.
 */
function extractBillingMonthsFromSchedule(
  billingPeriod: BillingPeriod,
  schedule: string | undefined
): number[] {
  if (!schedule) return [];

  const monthNameToNumber: Record<string, number> = {
    'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
    'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12,
  };

  // Extract all month names from the schedule
  const parts = schedule.split('-').map(p => p.trim().toUpperCase());
  const months = parts.map(p => monthNameToNumber[p]).filter(m => m !== undefined);

  return months;
}

/**
 * Get the billing month to display in a quarter column.
 * Uses the schedule selection (quarterlyMonths) to determine display for each period type.
 * Handles imported quarterly schedules for all period types.
 */
export function getQuarterDisplayMonth(
  billingPeriod: BillingPeriod,
  quarterlyMonths: string | undefined,
  quarter: QuarterDefinition
): string {
  const quarterlyScheduleMap: Record<string, number[]> = {
    'JAN-APR-JUL-OCT': [1, 4, 7, 10],
    'FEB-MAY-AUG-NOV': [2, 5, 8, 11],
    'MAR-JUN-SEP-DEC': [3, 6, 9, 12],
  };

  const monthNameToNumber: Record<string, number> = {
    'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
    'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12,
  };

  const numberToMonthName: Record<number, string> = {
    1: 'JAN', 2: 'FEB', 3: 'MAR', 4: 'APR', 5: 'MAY', 6: 'JUN',
    7: 'JUL', 8: 'AUG', 9: 'SEP', 10: 'OCT', 11: 'NOV', 12: 'DEC',
  };

  const halfYearlyMap: Record<string, number[]> = {
    'JAN-JUL': [1, 7],
    'FEB-AUG': [2, 8],
    'MAR-SEP': [3, 9],
    'APR-OCT': [4, 10],
    'MAY-NOV': [5, 11],
    'JUN-DEC': [6, 12],
  };

  // DEFAULT SCHEDULES for periods when quarterlyMonths is not set
  const getDefaultSchedule = (period: BillingPeriod): string | undefined => {
    switch (period) {
      case 'HY': return 'JAN-JUL';
      case 'YB': 
      case 'MBYX': return 'JAN';
      case 'QB':
      case 'MBQX':
      case 'QBYX': return 'JAN-APR-JUL-OCT';
      case '2MBX': return 'JAN-MAR-MAY-JUL-SEP-NOV';
      default: return undefined;
    }
  };

  // Use provided schedule or fall back to default
  const effectiveSchedule = quarterlyMonths || getDefaultSchedule(billingPeriod);

  // MBQX, QB, QBYX: Show ONLY the quarterly schedule month
  if (billingPeriod === 'MBQX' || billingPeriod === 'QB' || billingPeriod === 'QBYX') {
    if (!effectiveSchedule) return '';
    const billingMonths = quarterlyScheduleMap[effectiveSchedule] || [];
    
    // Find which month in this quarter matches the schedule
    for (let i = 0; i < quarter.months.length; i++) {
      if (billingMonths.includes(quarter.months[i])) {
        return quarter.names[i];
      }
    }
    return '';
  }

  // MB: Show all months in the quarter
  if (billingPeriod === 'MB') {
    return quarter.names.join(' ');
  }

  // MBYX: Show the selected yearly excess month only in its quarter
  // Handles both proper format "JAN" and imported quarterly "FEB-MAY-AUG-NOV"
  if (billingPeriod === 'MBYX') {
    let selectedMonth: number | undefined;
    
    // Check if it's a single month
    if (effectiveSchedule && monthNameToNumber[effectiveSchedule]) {
      selectedMonth = monthNameToNumber[effectiveSchedule];
    } else if (effectiveSchedule) {
      // Extract first month from quarterly schedule (e.g., "FEB-MAY-AUG-NOV" -> FEB)
      const extractedMonths = extractBillingMonthsFromSchedule(billingPeriod, effectiveSchedule);
      if (extractedMonths.length > 0) {
        selectedMonth = extractedMonths[0];
      }
    }
    
    if (selectedMonth && quarter.months.includes(selectedMonth)) {
      return numberToMonthName[selectedMonth] || '';
    }
    return '';
  }

  // Half-Yearly: Show months based on selected cycle
  // Handles both proper "JAN-JUL" format and imported quarterly "FEB-MAY-AUG-NOV"
  if (billingPeriod === 'HY') {
    let billingMonths: number[] = [];
    
    // Check if it's a proper half-yearly schedule
    if (effectiveSchedule && halfYearlyMap[effectiveSchedule]) {
      billingMonths = halfYearlyMap[effectiveSchedule];
    } else if (effectiveSchedule) {
      // Extract months from quarterly schedule and find 6-month pairs
      const extractedMonths = extractBillingMonthsFromSchedule(billingPeriod, effectiveSchedule);
      if (extractedMonths.length >= 1) {
        // Take first month and its 6-month counterpart
        const firstMonth = extractedMonths[0];
        const secondMonth = firstMonth <= 6 ? firstMonth + 6 : firstMonth - 6;
        billingMonths = [firstMonth, secondMonth].sort((a, b) => a - b);
      }
    }
    
    // Find matching month in this quarter
    for (let i = 0; i < quarter.months.length; i++) {
      if (billingMonths.includes(quarter.months[i])) {
        return quarter.names[i];
      }
    }
    return '';
  }

  // Yearly: Show the selected month in its quarter
  // Handles both proper "JAN" format and imported quarterly "FEB-MAY-AUG-NOV"
  if (billingPeriod === 'YB') {
    let selectedMonth: number | undefined;
    
    // Check if it's a single month
    if (effectiveSchedule && monthNameToNumber[effectiveSchedule]) {
      selectedMonth = monthNameToNumber[effectiveSchedule];
    } else if (effectiveSchedule) {
      // Extract first month from quarterly schedule
      const extractedMonths = extractBillingMonthsFromSchedule(billingPeriod, effectiveSchedule);
      if (extractedMonths.length > 0) {
        selectedMonth = extractedMonths[0];
      }
    }
    
    if (selectedMonth && quarter.months.includes(selectedMonth)) {
      return numberToMonthName[selectedMonth] || '';
    }
    return '';
  }

  // Bi-Monthly: Show months based on selected cycle (odd or even)
  if (billingPeriod === '2MBX') {
    if (effectiveSchedule === 'FEB-APR-JUN-AUG-OCT-DEC') {
      // Even months
      const evenMonths: string[] = [];
      quarter.months.forEach((month, idx) => {
        if (month % 2 === 0) {
          evenMonths.push(quarter.names[idx]);
        }
      });
      return evenMonths.join(' ');
    } else {
      // Odd months (default)
      const oddMonths: string[] = [];
      quarter.months.forEach((month, idx) => {
        if (month % 2 === 1) {
          oddMonths.push(quarter.names[idx]);
        }
      });
      return oddMonths.join(' ');
    }
  }

  return '';
}

import XLSX from 'xlsx-js-style';
import { Contract, BillingPeriodConfig } from '@/types/contracts';
import { getQuarterDisplayMonth, QuarterDefinition, MONTH_NAMES } from '@/lib/billingPeriodColors';
import { isDueInMonth } from '@/lib/invoiceDateLogic';

// Quarter definitions matching the dashboard
const QUARTERS = [
  { label: 'JAN-FEB-MAR', months: [1, 2, 3], names: ['JAN', 'FEB', 'MAR'] },
  { label: 'APR-MAY-JUN', months: [4, 5, 6], names: ['APR', 'MAY', 'JUN'] },
  { label: 'JUL-AUG-SEP', months: [7, 8, 9], names: ['JUL', 'AUG', 'SEP'] },
  { label: 'OCT-NOV-DEC', months: [10, 11, 12], names: ['OCT', 'NOV', 'DEC'] },
] as const satisfies readonly QuarterDefinition[];

/**
 * Filter contracts that have billing due in a specific month/year.
 * IMPORTANT: This must match the app's billing algorithm (startDate + invoiceDay "next occurrence" rule).
 */
export function getContractsDueInMonth(contracts: Contract[], month: number, year: number): Contract[] {
  return contracts.filter((contract) => isDueInMonth(contract, month, year));
}

/**
 * Export contracts for a specific month to Excel - single MANUAL BILLING sheet only
 */
export function exportMonthlyContractsToExcel(
  contracts: Contract[],
  month: number,
  year: number,
  allPeriods: BillingPeriodConfig[] = []
) {
  const dueContracts = getContractsDueInMonth(contracts, month, year);
  const monthName = MONTH_NAMES[month - 1];

  // Billing period order for grouping (MB first, then QB, etc.)
  const periodOrder: Record<string, number> = {
    'MB': 1, 'MBQX': 2, 'MBYX': 3, 'QB': 4, 'QBYX': 5, 'HY': 6, '2MBX': 7, 'YB': 8
  };

  // Sort by: 1) Invoice Day (5, 15, 25), 2) Billing Period type, 3) Schedule (empty first)
  const sortedContracts = [...dueContracts].sort((a, b) => {
    // Primary: invoice day
    if (a.invoiceDay !== b.invoiceDay) {
      return a.invoiceDay - b.invoiceDay;
    }
    // Secondary: billing period type (MB grouped together, QB grouped together, etc.)
    const periodDiff = (periodOrder[a.billingPeriod] || 99) - (periodOrder[b.billingPeriod] || 99);
    if (periodDiff !== 0) {
      return periodDiff;
    }
    // Tertiary: contracts without schedule first, then by schedule value
    const aSchedule = a.quarterlyMonths || '';
    const bSchedule = b.quarterlyMonths || '';
    return aSchedule.localeCompare(bSchedule);
  });

  const wb = XLSX.utils.book_new();

  // Single billing sheet only
  const mainSheet = createMonthlyBillingSheet(sortedContracts, allPeriods);
  XLSX.utils.book_append_sheet(wb, mainSheet, 'MANUAL BILLING');

  // Generate filename
  const filename = `Rental_Billing_${monthName}_${year}.xlsx`;
  XLSX.writeFile(wb, filename);

  return { count: sortedContracts.length, filename };
}

/**
 * Create monthly billing sheet with period colors - entire row colored
 * Includes invoice day separator rows (5th, 15th, 25th) for clear grouping
 */
export function createMonthlyBillingSheet(contracts: Contract[], allPeriods: BillingPeriodConfig[]): XLSX.WorkSheet {
  const headers = [
    'SI No', 'Contract#', 'Customer', 'Machine/Site', 'Period', 'Invoice Day', 'Billing Schedule',
    ...QUARTERS.map(q => q.label)
  ];
  const totalCols = headers.length;

  // Group contracts by invoice day and build rows with separator headers
  const invoiceDays = [5, 15, 25] as const;
  const allRows: { type: 'separator' | 'data'; data: (string | number)[]; contract?: Contract; day?: number }[] = [];
  let siNo = 1;

  for (const day of invoiceDays) {
    const dayContracts = contracts.filter(c => Number(c.invoiceDay) === day);
    if (dayContracts.length === 0) continue;

    // Add separator row
    const separatorRow = new Array(totalCols).fill('');
    separatorRow[0] = `INVOICE DAY: ${day}th`;
    allRows.push({ type: 'separator', data: separatorRow, day });

    // Add contract rows
    for (const contract of dayContracts) {
      const row: (string | number)[] = [
        siNo++,
        contract.contractNumber,
        contract.customer,
        contract.machineSite,
        contract.billingPeriod,
        contract.invoiceDay,
        contract.billingPeriod === 'MB' ? '' : (contract.quarterlyMonths || ''),
      ];
      QUARTERS.forEach((quarter) => {
        row.push(getQuarterDisplayMonth(contract.billingPeriod, contract.quarterlyMonths, quarter));
      });
      allRows.push({ type: 'data', data: row, contract });
    }
  }

  const ws = XLSX.utils.aoa_to_sheet([headers, ...allRows.map(r => r.data)]);

  applyHeaderStyling(ws);

  // Apply styling to data and separator rows
  let rowIdx = 1; // Start after header
  for (const row of allRows) {
    if (row.type === 'separator') {
      applySeparatorRowStyling(ws, rowIdx, totalCols, row.day!);
    } else if (row.contract) {
      applyDataRowStyling(ws, rowIdx, totalCols, row.contract, allPeriods);
    }
    rowIdx++;
  }

  ws['!cols'] = [
    { wch: 6 },   // SI No
    { wch: 12 },  // Contract#
    { wch: 40 },  // Customer
    { wch: 35 },  // Machine/Site
    { wch: 10 },  // Period
    { wch: 12 },  // Invoice Day
    { wch: 18 },  // Quarterly Months
    { wch: 16 },  // Q1
    { wch: 16 },  // Q2
    { wch: 16 },  // Q3
    { wch: 16 },  // Q4
  ];

  ws['!autofilter'] = { ref: ws['!ref'] || 'A1:K1' };

  return ws;
}

/**
 * Apply header styling - dark blue with gold text
 */
function applyHeaderStyling(ws: XLSX.WorkSheet): void {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

  for (let C = range.s.c; C <= range.e.c; C++) {
    const headerCell = ws[XLSX.utils.encode_cell({ r: 0, c: C })];
    if (headerCell) {
      headerCell.s = {
        fill: { fgColor: { rgb: '1E3A5F' } },
        font: { bold: true, color: { rgb: 'C9A227' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: '2D4A6F' } },
          bottom: { style: 'thin', color: { rgb: '2D4A6F' } },
          left: { style: 'thin', color: { rgb: '2D4A6F' } },
          right: { style: 'thin', color: { rgb: '2D4A6F' } },
        },
      };
    }
  }

  ws['!rows'] = [{ hpt: 35 }];
}

/**
 * Apply styling to invoice day separator rows - dark background with bold white text
 */
function applySeparatorRowStyling(ws: XLSX.WorkSheet, row: number, totalCols: number, day: number): void {
  for (let col = 0; col < totalCols; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
    if (!ws[cellAddress]) {
      ws[cellAddress] = { t: 's', v: '' };
    }
    ws[cellAddress].s = {
      fill: { patternType: 'solid', fgColor: { rgb: '2D2D2D' } },
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 12 },
      alignment: { horizontal: col === 0 ? 'left' : 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } },
      },
    };
  }
}

/**
 * Apply period-based coloring to a single data row
 */
function applyDataRowStyling(ws: XLSX.WorkSheet, row: number, totalCols: number, contract: Contract, allPeriods: BillingPeriodConfig[]): void {
  const periodConfig = allPeriods.find(p => p.code === contract.billingPeriod);
  const periodColors = periodConfig?.color;
  if (!periodColors) return;

  for (let col = 0; col < totalCols; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
    if (!ws[cellAddress]) {
      ws[cellAddress] = { t: 's', v: '' };
    }
    ws[cellAddress].s = {
      fill: { patternType: 'solid', fgColor: { rgb: periodColors.excelBg } },
      font: {
        bold: col === 4,
        color: { rgb: periodColors.excelText },
        sz: 11
      },
      alignment: {
        horizontal: col <= 3 ? 'left' : 'center',
        vertical: 'center'
      },
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } },
      },
    };
  }
}

/**
 * Get list of years for dropdown (current year and 5 years back/forward)
 */
export function getAvailableYears(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear - 5; y <= currentYear + 5; y++) {
    years.push(y);
  }
  return years;
}

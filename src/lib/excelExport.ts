import XLSX from 'xlsx-js-style';
import { Contract, BillingPeriod } from '@/types/contracts';
import { BILLING_PERIOD_COLORS, getQuarterDisplayMonth, QuarterDefinition } from '@/lib/billingPeriodColors';

// Quarter definitions matching the dashboard (standardized 3-letter format)
const QUARTERS = [
  { label: 'JAN-FEB-MAR', months: [1, 2, 3], names: ['JAN', 'FEB', 'MAR'] },
  { label: 'APR-MAY-JUN', months: [4, 5, 6], names: ['APR', 'MAY', 'JUN'] },
  { label: 'JUL-AUG-SEP', months: [7, 8, 9], names: ['JUL', 'AUG', 'SEP'] },
  { label: 'OCT-NOV-DEC', months: [10, 11, 12], names: ['OCT', 'NOV', 'DEC'] },
] as const satisfies readonly QuarterDefinition[];

/**
 * Export contracts to single-sheet Excel with period-based row coloring
 * Headers: Contract#, Customer, Machine/Site, Period, Invoice Day, Quarterly Months, Q1, Q2, Q3, Q4
 */
export function exportContractsToExcel(contracts: Contract[]) {
  const wb = XLSX.utils.book_new();

  // Create single billing sheet
  const ws = createBillingSheet(contracts);
  XLSX.utils.book_append_sheet(wb, ws, 'MANUAL BILLING');

  // Generate filename with date
  const date = new Date().toISOString().split('T')[0];
  const filename = `Rental_Billing_${date}.xlsx`;

  XLSX.writeFile(wb, filename);
}

/**
 * Create billing sheet with quarterly columns and period-based row coloring
 * Columns: Contract#, Customer, Machine/Site, Period, Invoice Day, Quarterly Months, Q1, Q2, Q3, Q4
 */
function createBillingSheet(contracts: Contract[]): XLSX.WorkSheet {
  // Build header row with SI No as first column
  const headers = [
    'SI No', 'Contract#', 'Customer', 'Machine/Site', 'Period', 'Invoice Day', 'Billing Schedule',
    ...QUARTERS.map(q => q.label)
  ];

  // Build data rows with SI No
  const rows = contracts.map((contract, index) => {
    const row: (string | number)[] = [
      index + 1,  // SI No (1-based index)
      contract.contractNumber,
      contract.customer,
      contract.machineSite,
      contract.billingPeriod,
      contract.invoiceDay,
      // MB period doesn't show billing schedule - it bills all months
      contract.billingPeriod === 'MB' ? '' : (contract.quarterlyMonths || ''),
    ];
    
    // Add quarter billing months (only the specific month, not all)
    QUARTERS.forEach((quarter) => {
      row.push(getQuarterDisplayMonth(contract.billingPeriod, contract.quarterlyMonths, quarter));
    });
    
    return row;
  });

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  
  // Apply header styling - dark blue with gold text
  applyHeaderStyling(ws);
  
  // Apply period-based row coloring (entire row colored by period)
  applyPeriodRowColoring(ws, contracts);
  
  // Column widths (updated for SI No column)
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

  // Enable AutoFilter for dropdown sorting (K column now with SI No)
  ws['!autofilter'] = { ref: ws['!ref'] || 'A1:K1' };

  return ws;
}

/**
 * Apply header styling - dark blue background (#1E3A5F) with gold text (#C9A227)
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

  // Set header row height
  ws['!rows'] = [{ hpt: 35 }];
}

/**
 * Apply period-based coloring to entire rows
 * Each row gets the background color of its billing period across ALL columns
 * This ensures consistent visual grouping by billing period type
 */
function applyPeriodRowColoring(ws: XLSX.WorkSheet, contracts: Contract[]): void {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const totalCols = range.e.c + 1;
  
  contracts.forEach((contract, rowIndex) => {
    const periodColors = BILLING_PERIOD_COLORS[contract.billingPeriod];
    if (!periodColors) return;
    
    const row = rowIndex + 1; // Skip header row (row 0)
    
    // Apply styling to ALL cells in the row - create cell if it doesn't exist
    for (let col = 0; col < totalCols; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      
      // Create cell if it doesn't exist (for empty quarter columns)
      if (!ws[cellAddress]) {
        ws[cellAddress] = { t: 's', v: '' };
      }
      
      const cell = ws[cellAddress];
      
      // Apply full styling to every cell in the row
      cell.s = {
        fill: { 
          patternType: 'solid',
          fgColor: { rgb: periodColors.excelBg }
        },
        font: { 
          bold: col === 4, // Bold the Period column (now at index 4 due to SI No)
          color: { rgb: periodColors.excelText },
          sz: 11
        },
        alignment: { 
          horizontal: col <= 3 ? 'left' : 'center',  // SI No, Contract#, Customer, Machine/Site left-aligned
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
  });
}

// Legacy export for Reports page
export function exportContractsReport(contracts: Contract[]) {
  exportContractsToExcel(contracts);
}

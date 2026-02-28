import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Contract, BillingPeriodConfig } from '@/types/contracts';
import { getQuarterDisplayMonth, QuarterDefinition } from '@/lib/billingPeriodColors';

// Quarter definitions matching the dashboard (standardized 3-letter format)
const QUARTERS = [
  { label: 'JAN-FEB-MAR', months: [1, 2, 3], names: ['JAN', 'FEB', 'MAR'] },
  { label: 'APR-MAY-JUN', months: [4, 5, 6], names: ['APR', 'MAY', 'JUN'] },
  { label: 'JUL-AUG-SEP', months: [7, 8, 9], names: ['JUL', 'AUG', 'SEP'] },
  { label: 'OCT-NOV-DEC', months: [10, 11, 12], names: ['OCT', 'NOV', 'DEC'] },
] as const satisfies readonly QuarterDefinition[];

/**
 * Export contracts to single-sheet Excel with period-based row coloring
 */
export async function exportContractsToExcel(contracts: Contract[], allPeriods: BillingPeriodConfig[] = []) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('MANUAL BILLING', { views: [{ state: 'frozen', ySplit: 1 }] });

  createBillingSheet(ws, contracts, allPeriods);

  const date = new Date().toISOString().split('T')[0];
  const filename = `Rental_Billing_${date}.xlsx`;

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), filename);
}

/**
 * Configure billing sheet with quarterly columns and period-based row coloring
 */
function createBillingSheet(ws: ExcelJS.Worksheet, contracts: Contract[], allPeriods: BillingPeriodConfig[]): void {
  // Define columns
  ws.columns = [
    { header: 'SI No', key: 'siNo', width: 8 },
    { header: 'Contract#', key: 'contractNumber', width: 14 },
    { header: 'Customer', key: 'customer', width: 42 },
    { header: 'Machine/Site', key: 'machineSite', width: 37 },
    { header: 'Period', key: 'period', width: 12 },
    { header: 'Invoice Day', key: 'invoiceDay', width: 14 },
    { header: 'Billing Schedule', key: 'billingSchedule', width: 20 },
    ...QUARTERS.map((q, i) => ({ header: q.label, key: `q${i + 1}`, width: 18 }))
  ];

  // Apply header styling - dark blue background (#1E3A5F) with gold text (#C9A227)
  ws.getRow(1).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    cell.font = { bold: true, color: { argb: 'FFC9A227' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF2D4A6F' } },
      bottom: { style: 'thin', color: { argb: 'FF2D4A6F' } },
      left: { style: 'thin', color: { argb: 'FF2D4A6F' } },
      right: { style: 'thin', color: { argb: 'FF2D4A6F' } },
    };
  });
  ws.getRow(1).height = 35;

  // Build data rows
  contracts.forEach((contract, index) => {
    const rowData: any = {
      siNo: index + 1,
      contractNumber: contract.contractNumber,
      customer: contract.customer,
      machineSite: contract.machineSite,
      period: contract.billingPeriod,
      invoiceDay: contract.invoiceDay,
      billingSchedule: contract.billingPeriod === 'MB' ? '' : (contract.quarterlyMonths || '')
    };

    QUARTERS.forEach((quarter, i) => {
      rowData[`q${i + 1}`] = getQuarterDisplayMonth(contract.billingPeriod, contract.quarterlyMonths, quarter);
    });

    const row = ws.addRow(rowData);

    // Apply period-based coloring to entire rows
    const periodConfig = allPeriods.find(p => p.code === contract.billingPeriod);
    if (periodConfig?.color) {
      let bgColor = periodConfig.color.excelBg.replace('#', '');
      let textColor = periodConfig.color.excelText.replace('#', '');

      if (bgColor.length === 6) bgColor = 'FF' + bgColor;
      if (textColor.length === 6) textColor = 'FF' + textColor;

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor.toUpperCase() } };
        cell.font = {
          bold: colNumber === 5, // Bold the Period column
          color: { argb: textColor.toUpperCase() },
          size: 11
        };
        cell.alignment = {
          horizontal: colNumber <= 4 ? 'left' : 'center',
          vertical: 'middle'
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } },
        };
      });
    }
  });

  // Enable AutoFilter
  ws.autoFilter = 'A1:K1';
}

// Legacy export for Reports page
export async function exportContractsReport(contracts: Contract[], allPeriods: BillingPeriodConfig[] = []) {
  await exportContractsToExcel(contracts, allPeriods);
}

/**
 * Export top customers to single-sheet Excel
 */
export async function exportTopCustomersToExcel(topCustomers: { customer: string, count: number }[]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Top Customers', { views: [{ state: 'frozen', ySplit: 1 }] });

  ws.columns = [
    { header: 'Rank', key: 'rank', width: 10 },
    { header: 'Customer Name', key: 'customer', width: 40 },
    { header: 'Contract Count', key: 'count', width: 20 },
  ];

  ws.getRow(1).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }; // slate-200
    cell.font = { bold: true, color: { argb: 'FF0F172A' } }; // slate-900
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });
  ws.getRow(1).height = 30;

  topCustomers.forEach((c, i) => {
    ws.addRow({ rank: i + 1, customer: c.customer, count: c.count });
  });

  const date = new Date().toISOString().split('T')[0];
  const filename = `Top_Customers_${date}.xlsx`;

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), filename);

  return { count: topCustomers.length, filename };
}

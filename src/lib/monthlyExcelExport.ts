import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Contract, BillingPeriodConfig } from '@/types/contracts';
import { getQuarterDisplayMonth, QuarterDefinition, MONTH_NAMES } from '@/lib/billingPeriodColors';
import { isDueInMonth } from '@/lib/invoiceDateLogic';

const QUARTERS = [
  { label: 'JAN-FEB-MAR', months: [1, 2, 3], names: ['JAN', 'FEB', 'MAR'] },
  { label: 'APR-MAY-JUN', months: [4, 5, 6], names: ['APR', 'MAY', 'JUN'] },
  { label: 'JUL-AUG-SEP', months: [7, 8, 9], names: ['JUL', 'AUG', 'SEP'] },
  { label: 'OCT-NOV-DEC', months: [10, 11, 12], names: ['OCT', 'NOV', 'DEC'] },
] as const satisfies readonly QuarterDefinition[];

export function getContractsDueInMonth(contracts: Contract[], month: number, year: number): Contract[] {
  return contracts.filter((contract) => isDueInMonth(contract, month, year));
}

export async function exportMonthlyContractsToExcel(
  contracts: Contract[],
  month: number,
  year: number,
  allPeriods: BillingPeriodConfig[] = []
) {
  const dueContracts = getContractsDueInMonth(contracts, month, year);
  const monthName = MONTH_NAMES[month - 1];

  const periodOrder: Record<string, number> = {
    'MB': 1, '2MBX': 2, 'MBQX': 3, 'MBYX': 4, 'QB': 5, 'QBYX': 6, 'HY': 7, 'YB': 8
  };

  const sortedContracts = [...dueContracts].sort((a, b) => {
    if (a.invoiceDay !== b.invoiceDay) return a.invoiceDay - b.invoiceDay;
    const periodDiff = (periodOrder[a.billingPeriod] || 99) - (periodOrder[b.billingPeriod] || 99);
    if (periodDiff !== 0) return periodDiff;
    const aSchedule = a.quarterlyMonths || '';
    const bSchedule = b.quarterlyMonths || '';
    return aSchedule.localeCompare(bSchedule);
  });

  const wb = new ExcelJS.Workbook();

  const mainSheet = wb.addWorksheet('MANUAL BILLING', { views: [{ state: 'frozen', ySplit: 1 }] });
  createMonthlyBillingSheet(mainSheet, sortedContracts, allPeriods);

  const invoiceDays = [5, 15, 25];

  for (const day of invoiceDays) {
    const dayContracts = sortedContracts.filter(c => Number(c.invoiceDay) === day);

    if (dayContracts.length > 0) {
      dayContracts.sort((a, b) => {
        // 1. Primary: Hierarchical Priority by Billing Period (MB -> 2MBX -> MBQX...)
        const periodDiff = (periodOrder[a.billingPeriod] || 99) - (periodOrder[b.billingPeriod] || 99);
        if (periodDiff !== 0) return periodDiff;

        // 2. Secondary: Alphabetical if exact SAME period
        const keyA = a.customer.toLowerCase().replace(/[^a-z0-9]/g, '');
        const keyB = b.customer.toLowerCase().replace(/[^a-z0-9]/g, '');
        return keyA.localeCompare(keyB);
      });

      const daySheetName = `${day}th`;
      const daySheet = wb.addWorksheet(daySheetName, { views: [{ state: 'frozen', ySplit: 1 }] });
      createIndividualDaySheet(daySheet, dayContracts, allPeriods);
    }
  }

  const filename = `Rental_Billing_${monthName}_${year}.xlsx`;
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), filename);

  return { count: sortedContracts.length, filename };
}

export function createMonthlyBillingSheet(ws: ExcelJS.Worksheet, contracts: Contract[], allPeriods: BillingPeriodConfig[]): void {
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

  const totalCols = ws.columns.length;
  applyHeaderStyling(ws.getRow(1), totalCols);

  const invoiceDays = [5, 15, 25] as const;
  let siNo = 1;

  for (const day of invoiceDays) {
    const dayContracts = contracts.filter(c => Number(c.invoiceDay) === day);
    if (dayContracts.length === 0) continue;

    // Add separator row
    const separatorRow = ws.addRow({ siNo: `INVOICE DAY: ${day}th` });
    applySeparatorRowStyling(separatorRow, totalCols);

    // Add contract rows
    for (const contract of dayContracts) {
      const rowData: any = {
        siNo: siNo++,
        contractNumber: contract.contractNumber,
        customer: contract.customer,
        machineSite: contract.machineSite,
        period: contract.billingPeriod,
        invoiceDay: contract.invoiceDay,
        billingSchedule: contract.billingPeriod === 'MB' ? '' : (contract.quarterlyMonths || '')
      };
      QUARTERS.forEach((q, i) => {
        rowData[`q${i + 1}`] = getQuarterDisplayMonth(contract.billingPeriod, contract.quarterlyMonths, q);
      });

      const row = ws.addRow(rowData);
      applyDataRowStyling(row, totalCols, contract, allPeriods);
    }
  }

  ws.autoFilter = 'A1:K1';
}

export function createIndividualDaySheet(ws: ExcelJS.Worksheet, contracts: Contract[], allPeriods: BillingPeriodConfig[]): void {
  ws.columns = [
    { header: 'SI No', key: 'siNo', width: 8 },
    { header: 'Contract#', key: 'contractNumber', width: 14 },
    { header: 'Customer', key: 'customer', width: 42 },
    { header: 'Machine/Site', key: 'machineSite', width: 37 },
    { header: 'Period', key: 'period', width: 12 },
    { header: 'Invoice Day', key: 'invoiceDay', width: 14 },
  ];

  const totalCols = ws.columns.length;
  applyHeaderStyling(ws.getRow(1), totalCols);

  let siNo = 1;
  for (const contract of contracts) {
    const rowData = {
      siNo: siNo++,
      contractNumber: contract.contractNumber,
      customer: contract.customer,
      machineSite: contract.machineSite,
      period: contract.billingPeriod,
      invoiceDay: contract.invoiceDay
    };
    const row = ws.addRow(rowData);
    applyDataRowStyling(row, totalCols, contract, allPeriods);
  }

  ws.autoFilter = 'A1:F1';
}

function applyHeaderStyling(row: ExcelJS.Row, totalCols: number): void {
  for (let i = 1; i <= totalCols; i++) {
    const cell = row.getCell(i);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    cell.font = { bold: true, color: { argb: 'FFC9A227' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF2D4A6F' } },
      bottom: { style: 'thin', color: { argb: 'FF2D4A6F' } },
      left: { style: 'thin', color: { argb: 'FF2D4A6F' } },
      right: { style: 'thin', color: { argb: 'FF2D4A6F' } },
    };
  }
  row.height = 35;
}

function applySeparatorRowStyling(row: ExcelJS.Row, totalCols: number): void {
  for (let i = 1; i <= totalCols; i++) {
    const cell = row.getCell(i);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D2D2D' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    cell.alignment = { horizontal: i === 1 ? 'left' : 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };
  }
}

function applyDataRowStyling(row: ExcelJS.Row, totalCols: number, contract: Contract, allPeriods: BillingPeriodConfig[]): void {
  const periodConfig = allPeriods.find(p => p.code === contract.billingPeriod);
  if (!periodConfig?.color) return;

  let bgColor = periodConfig.color.excelBg.replace('#', '');
  let textColor = periodConfig.color.excelText.replace('#', '');

  if (bgColor.length === 6) bgColor = 'FF' + bgColor;
  if (textColor.length === 6) textColor = 'FF' + textColor;

  for (let colNumber = 1; colNumber <= totalCols; colNumber++) {
    const cell = row.getCell(colNumber);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor.toUpperCase() } };
    cell.font = {
      bold: colNumber === 5,
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
  }
}

export function getAvailableYears(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear - 5; y <= currentYear + 5; y++) {
    years.push(y);
  }
  return years;
}

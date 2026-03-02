import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Contract, BillingPeriodConfig } from '@/types/contracts';
import { getQuarterDisplayMonth, QuarterDefinition, MONTH_NAMES } from '@/lib/billingPeriodColors';

const QUARTERS: readonly QuarterDefinition[] = [
    { label: 'JAN-FEB-MAR', months: [1, 2, 3], names: ['JAN', 'FEB', 'MAR'] },
    { label: 'APR-MAY-JUN', months: [4, 5, 6], names: ['APR', 'MAY', 'JUN'] },
    { label: 'JUL-AUG-SEP', months: [7, 8, 9], names: ['JUL', 'AUG', 'SEP'] },
    { label: 'OCT-NOV-DEC', months: [10, 11, 12], names: ['OCT', 'NOV', 'DEC'] },
];

/**
 * Export Installation Report (all contracts, "Billing Schedule" replaced with "Installation Date").
 * Columns: SI No, Contract#, Customer, Machine/Site, Period, Invoice Day, Installation Date, + 4 quarterly columns
 */
export async function exportInstallationTableToExcel(
    contracts: Contract[],
    selectedMonth: number | null,
    selectedYear: number | null,
    allPeriods: BillingPeriodConfig[] = []
) {
    // Filter by installation month (startDate)
    let filtered = [...contracts];

    if (selectedMonth !== null && selectedYear !== null) {
        filtered = filtered.filter(c => {
            if (!c.startDate) return false;
            const parts = c.startDate.split('-');
            if (parts.length < 2) return false;
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            return month === selectedMonth && year === selectedYear;
        });
    }

    if (filtered.length === 0) {
        return { count: 0, filename: '' };
    }

    const wb = new ExcelJS.Workbook();
    const monthLabel = selectedMonth !== null ? MONTH_NAMES[selectedMonth - 1] : 'All';
    const yearLabel = selectedYear !== null ? selectedYear : '';
    const sheetName = `Installation Report - ${monthLabel} ${yearLabel}`.trim();

    const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });

    // Columns — same as main billing sheet but "Billing Schedule" → "Installation Date"
    ws.columns = [
        { header: 'SI No', key: 'siNo', width: 8 },
        { header: 'Contract#', key: 'contractNumber', width: 14 },
        { header: 'Customer', key: 'customer', width: 42 },
        { header: 'Machine/Site', key: 'machineSite', width: 37 },
        { header: 'Period', key: 'period', width: 12 },
        { header: 'Invoice Day', key: 'invoiceDay', width: 14 },
        { header: 'Installation Date', key: 'installationDate', width: 20 },
        ...QUARTERS.map((q, i) => ({ header: q.label, key: `q${i + 1}`, width: 18 })),
    ];

    // Header styling — dark blue with gold text (consistent with other exports)
    ws.getRow(1).eachCell((cell) => {
        cell.fill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF1E3A5F' } };
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

    // Data rows
    filtered.forEach((contract, index) => {
        const rowData: Record<string, any> = {
            siNo: index + 1,
            contractNumber: contract.contractNumber,
            customer: contract.customer,
            machineSite: contract.machineSite,
            period: contract.billingPeriod,
            invoiceDay: contract.invoiceDay,
            installationDate: contract.startDate || '—',
        };

        QUARTERS.forEach((quarter, i) => {
            rowData[`q${i + 1}`] = getQuarterDisplayMonth(contract.billingPeriod, contract.quarterlyMonths, quarter);
        });

        const row = ws.addRow(rowData);

        // Period-based row coloring
        const periodConfig = allPeriods.find(p => p.code === contract.billingPeriod);
        if (periodConfig?.color) {
            let bgColor = periodConfig.color.excelBg.replace('#', '');
            let textColor = periodConfig.color.excelText.replace('#', '');
            if (bgColor.length === 6) bgColor = 'FF' + bgColor;
            if (textColor.length === 6) textColor = 'FF' + textColor;

            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                cell.fill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: bgColor.toUpperCase() } };
                cell.font = {
                    bold: colNumber === 5,
                    color: { argb: textColor.toUpperCase() },
                    size: 11,
                };
                cell.alignment = {
                    horizontal: colNumber <= 4 ? 'left' : 'center',
                    vertical: 'middle',
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

    // AutoFilter
    ws.autoFilter = 'A1:K1';

    const date = new Date().toISOString().split('T')[0];
    const filename = `Installation_Report_${monthLabel}_${yearLabel || 'All'}_${date}.xlsx`;

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), filename);

    return { count: filtered.length, filename };
}

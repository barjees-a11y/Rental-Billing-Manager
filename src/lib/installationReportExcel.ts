import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Contract } from '@/types/contracts';
import { MONTH_NAMES } from '@/lib/billingPeriodColors';

/**
 * Export Installation Report (cancelled contracts) to Excel.
 * Columns: SI No, Contract, Customer, Machine/Site, Cancelled On
 */
export async function exportInstallationReportToExcel(
    contracts: Contract[],
    selectedMonth: number | null,
    selectedYear: number | null
) {
    // Filter cancelled contracts
    let filtered = contracts.filter(c => c.status === 'pulled_out' || c.status === 'archived');

    // Apply month filter if set
    if (selectedMonth !== null && selectedYear !== null) {
        filtered = filtered.filter(c => {
            if (!c.terminationDate) return false;
            const parts = c.terminationDate.split('-');
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
    const sheetName = `Cancelled Contracts - ${monthLabel} ${yearLabel}`.trim();

    const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });

    // Define columns
    ws.columns = [
        { header: 'SI No', key: 'siNo', width: 10 },
        { header: 'Contract', key: 'contract', width: 20 },
        { header: 'Customer', key: 'customer', width: 40 },
        { header: 'Machine / Site', key: 'machineSite', width: 35 },
        { header: 'Cancelled On', key: 'cancelledOn', width: 18 },
    ];

    // Header styling — consistent with existing exports
    ws.getRow(1).eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
        cell.font = { bold: true, color: { argb: 'FFC9A227' }, size: 11 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FF2D4A6F' } },
            bottom: { style: 'thin', color: { argb: 'FF2D4A6F' } },
            left: { style: 'thin', color: { argb: 'FF2D4A6F' } },
            right: { style: 'thin', color: { argb: 'FF2D4A6F' } },
        };
    });
    ws.getRow(1).height = 30;

    // Add data rows
    filtered.forEach((contract, index) => {
        const row = ws.addRow({
            siNo: index + 1,
            contract: contract.contractNumber,
            customer: contract.customer,
            machineSite: contract.machineSite,
            cancelledOn: contract.terminationDate || '—',
        });

        // Alternate row shading
        const bgColor = index % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';
        row.eachCell({ includeEmpty: true }, (cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
            cell.font = { size: 11, color: { argb: 'FF1E293B' } };
            cell.alignment = { vertical: 'middle' };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            };
        });
    });

    // Auto-filter
    ws.autoFilter = 'A1:E1';

    const date = new Date().toISOString().split('T')[0];
    const filename = `Cancelled_Contracts_${monthLabel}_${yearLabel || 'All'}_${date}.xlsx`;

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), filename);

    return { count: filtered.length, filename };
}

import XLSX from 'xlsx-js-style';
import { Contract } from '@/types/contracts';

/**
 * Export ALL contracts to Excel
 * Sorted by creation date (Oldest first) as per user request: "companies according their joining"
 */
export function exportAllContractsToExcel(contracts: Contract[]) {
    // 1. Sort by createdAt (ASC) = Oldest first
    const sortedContracts = [...contracts].sort((a, b) => {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // 2. Prepare Data
    const data = sortedContracts.map((c, index) => ({
        'SI No': c.siNo || index + 1,
        'Contract #': c.contractNumber,
        'Customer': c.customer,
        'Machine / Site': c.machineSite,
        'Billing Period': c.billingPeriod,
        'Invoice Day': c.invoiceDay,
        'Start Date': c.startDate,
        'Status': c.status.toUpperCase(),
        'Rental Fee': c.rentalFee || 0,
        'Joined': c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '-'
    }));

    // 3. Create Sheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // 4. Style Header
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + '1';
        if (!ws[address]) continue;
        ws[address].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4472C4" } }, // Blue header
            alignment: { horizontal: "center" }
        };
    }

    // 5. Auto-width columns (rough approx)
    ws['!cols'] = [
        { wch: 8 },  // SI No
        { wch: 15 }, // Contract #
        { wch: 30 }, // Customer
        { wch: 25 }, // Machine
        { wch: 10 }, // Period
        { wch: 10 }, // Day
        { wch: 12 }, // Start Date
        { wch: 10 }, // Status
        { wch: 12 }, // Fee
        { wch: 12 }, // Joined
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'All Contracts');

    // 6. Download
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `All_Contracts_${date}.xlsx`);

    return { count: sortedContracts.length };
}

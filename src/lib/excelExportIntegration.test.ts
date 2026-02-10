import { describe, it, expect, vi } from 'vitest';
import { exportMonthlyContractsToExcel } from './monthlyExcelExport';
import { Contract } from '@/types/contracts';
import XLSX from 'xlsx-js-style';

// Mock XLSX to prevent file writing
vi.mock('xlsx-js-style', () => ({
    default: {
        utils: {
            book_new: () => ({}),
            book_append_sheet: () => { },
            aoa_to_sheet: () => ({}),
            encode_cell: () => 'A1',
            decode_range: () => ({ s: { c: 0, r: 0 }, e: { c: 0, r: 0 } }),
        },
        writeFile: vi.fn(),
    },
}));

const createContract = (overrides: Partial<Contract> = {}): Contract => ({
    id: '1',
    contractNumber: 'CN-001',
    customer: 'Test Customer',
    machineSite: 'Test Site',
    billingPeriod: 'MB',
    invoiceDay: 5,
    startDate: '2025-01-01',
    status: 'active',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    ...overrides,
} as Contract);

describe('monthlyExcelExport - Integration', () => {
    it('should include mixed string/number invoiceDays in the export count', () => {
        const contracts = [
            createContract({ invoiceDay: 5, contractNumber: 'DAY-5-NUM' }),
            // @ts-ignore
            createContract({ invoiceDay: "5", contractNumber: 'DAY-5-STR' }),
            createContract({ invoiceDay: 15, contractNumber: 'DAY-15-NUM' }),
        ];

        // February 2025
        const result = exportMonthlyContractsToExcel(contracts, 2, 2025);

        // Should pass: All 3 contracts are due in Feb 2025 (MB), and should be included in the sheet
        // The previous bug would have filtered out "5", resulting in count 2.
        // The fix should result in count 3.
        expect(result.count).toBe(3);

        expect(XLSX.writeFile).toHaveBeenCalled();
    });
});

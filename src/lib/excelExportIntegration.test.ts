import { describe, it, expect, vi } from 'vitest';
import { exportMonthlyContractsToExcel } from './monthlyExcelExport';
import { Contract } from '@/types/contracts';
import { saveAs } from 'file-saver';

// Mock file-saver to prevent browser downloads (monthlyExcelExport uses exceljs + file-saver)
vi.mock('file-saver', () => ({
    saveAs: vi.fn(),
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
    it('should include mixed string/number invoiceDays in the export count', async () => {
        const contracts = [
            createContract({ invoiceDay: 5, contractNumber: 'DAY-5-NUM' }),
            // @ts-ignore
            createContract({ invoiceDay: "5", contractNumber: 'DAY-5-STR' }),
            createContract({ invoiceDay: 15, contractNumber: 'DAY-15-NUM' }),
        ];

        // February 2025
        const result = await exportMonthlyContractsToExcel(contracts, 2, 2025);

        // Should pass: All 3 contracts are due in Feb 2025 (MB), and should be included in the sheet
        // The previous bug would have filtered out "5", resulting in count 2.
        // The fix should result in count 3.
        expect(result.count).toBe(3);

        expect(saveAs).toHaveBeenCalledTimes(1);
        const [blob, filename] = (saveAs as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(blob).toBeInstanceOf(Blob);
        expect(filename).toBe('Rental_Billing_FEB_2025.xlsx');
    });
});

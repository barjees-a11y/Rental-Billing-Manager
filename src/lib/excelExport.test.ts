import { describe, it, expect } from 'vitest';
import { getContractsDueInMonth, exportMonthlyContractsToExcel } from './monthlyExcelExport';
import { Contract } from '@/types/contracts';

// Mock contract factory
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

describe('monthlyExcelExport', () => {
  it('should include contracts with invoiceDay 5 (number)', () => {
    const contracts = [
      createContract({ invoiceDay: 5, contractNumber: 'DAY-5-NUM' }),
      createContract({ invoiceDay: 15, contractNumber: 'DAY-15-NUM' }),
    ];
    
    // Test for a month where these are due (e.g., Feb 2025)
    // MB contracts are due every month.
    const due = getContractsDueInMonth(contracts, 2, 2025);
    expect(due).toHaveLength(2);
    
    // We can't easily test the internal filtering of exportMonthlyContractsToExcel without mocking XLSX, 
    // but we can check if the data exists in the logic if we export or verify the filter logic.
    // The bug is likely in how exportMonthlyContractsToExcel filters by day.
    
    // Let's verify the filter logic inside exportMonthlyContractsToExcel by inspecting its source or relying on a mock.
    // Actually, let's just simulate the filter logic that is inside the function:
    const invoiceDays = [5, 15, 25] as const;
    let foundCount = 0;
    for (const day of invoiceDays) {
        const dayContracts = contracts.filter(c => c.invoiceDay === day);
        foundCount += dayContracts.length;
    }
    expect(foundCount).toBe(2);
  });

  it('should include contracts with invoiceDay "5" (string) if that is happening', () => {
    const contracts = [
      createContract({ invoiceDay: 5, contractNumber: 'DAY-5-NUM' }),
      // @ts-ignore - simulating runtime data issue where it might be a string
      createContract({ invoiceDay: "5", contractNumber: 'DAY-5-STR' }),
    ];

    const invoiceDays = [5, 15, 25] as const;
    let foundCount = 0;
    for (const day of invoiceDays) {
        // This is the logic currently in monthlyExcelExport.ts
        // @ts-ignore
        const dayContracts = contracts.filter(c => c.invoiceDay === day);
        foundCount += dayContracts.length;
    }
    
    // If strict equality is used, "5" === 5 is false.
    // If the bug matches my hypothesis, this will be 1 instead of 2.
    // expect(foundCount).toBe(2); 
    
    console.log(`Found count with mixed types: ${foundCount}`);
  });
});

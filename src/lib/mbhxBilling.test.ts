import { describe, expect, it } from 'vitest';
import { calculateNextInvoiceDate, isDueInMonth } from './invoiceDateLogic';
import { getMonthMarker, getQuarterDisplayMonth, QUARTER_GROUPS } from './billingPeriodColors';
import { Contract, DEFAULT_BILLING_PERIODS } from '@/types/contracts';

const createContract = (overrides: Partial<Contract> = {}): Contract => ({
  id: 'mbhx-test',
  contractNumber: 'MBHX-001',
  customer: 'Test Customer',
  machineSite: 'Test Site',
  billingPeriod: 'MBHX',
  invoiceDay: 15,
  startDate: '2025-01-01',
  status: 'active',
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
  ...overrides,
});

describe('MBHX billing period', () => {
  it('is registered as a monthly period with half-yearly excess logic', () => {
    const period = DEFAULT_BILLING_PERIODS.find(({ code }) => code === 'MBHX');

    expect(period?.billingLogic).toEqual({
      monthly: true,
      quarterly: false,
      halfYearly: true,
      yearly: false,
      biMonthly: false,
    });
  });

  it('generates monthly invoice dates', () => {
    const nextInvoiceDate = calculateNextInvoiceDate(
      'MBHX',
      15,
      'JAN-JUL',
      '2025-01-01',
      undefined,
      new Date(2025, 0, 16),
    );

    expect(nextInvoiceDate?.slice(0, 7)).toBe('2025-02');
    expect(isDueInMonth(createContract(), 3, 2025)).toBe(true);
  });

  it('marks the selected half-yearly excess months', () => {
    expect(getMonthMarker('MBHX', 'JAN-JUL', 1)).toBe('X');
    expect(getMonthMarker('MBHX', 'JAN-JUL', 7)).toBe('X');
    expect(getMonthMarker('MBHX', 'JAN-JUL', 4)).toBe('');
    expect(getMonthMarker('MBHX', 'FEB-AUG', 2)).toBe('X');
  });

  it('displays MBHX excess months in the correct quarter', () => {
    expect(getQuarterDisplayMonth('MBHX', 'JAN-JUL', QUARTER_GROUPS[0])).toBe('JAN');
    expect(getQuarterDisplayMonth('MBHX', 'JAN-JUL', QUARTER_GROUPS[2])).toBe('JUL');
  });
});

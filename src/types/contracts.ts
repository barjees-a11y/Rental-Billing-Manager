// Billing period types as per PDR
export type BillingPeriod = 'MB' | 'QB' | 'MBQX' | 'QBYX' | 'YB' | 'HY' | '2MBX' | 'MBYX';

// Invoice day options
export type InvoiceDay = 5 | 15 | 25;

// Billing schedule options (extends beyond just quarterly months)
export type QuarterlyMonths =
  // Quarterly schedules
  | 'JAN-APR-JUL-OCT'
  | 'FEB-MAY-AUG-NOV'
  | 'MAR-JUN-SEP-DEC'
  // Yearly/MBYX month options
  | 'JAN' | 'FEB' | 'MAR' | 'APR' | 'MAY' | 'JUN'
  | 'JUL' | 'AUG' | 'SEP' | 'OCT' | 'NOV' | 'DEC'
  // Half-yearly options
  | 'JAN-JUL' | 'FEB-AUG' | 'MAR-SEP' | 'APR-OCT' | 'MAY-NOV' | 'JUN-DEC'
  // Bi-monthly options
  | 'JAN-MAR-MAY-JUL-SEP-NOV' | 'FEB-APR-JUN-AUG-OCT-DEC';

// Contract status
export type ContractStatus = 'active' | 'expired' | 'pulled_out' | 'pending' | 'suspended' | 'archived';

export interface Contract {
  id: string;
  siNo?: number;  // Persistent SI No from import or sequential assignment
  contractNumber: string;
  customer: string;
  machineSite: string;
  billingPeriod: BillingPeriod;
  invoiceDay: InvoiceDay;
  quarterlyMonths?: QuarterlyMonths;
  rentalFee?: number;
  startDate: string;
  endDate?: string;
  pulloutDate?: string;
  status: ContractStatus;
  notes?: string;
  terminationDate?: string;
  terminationReason?: string;
  nextInvoiceDate?: string;  // Auto-calculated
  lastInvoiceDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

// Billing period descriptions for UI
export const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = {
  'MB': 'Monthly Billing',
  'QB': 'Quarterly Billing',
  'MBQX': 'Monthly + Quarterly',
  'QBYX': 'Quarterly + Yearly',
  'YB': 'Yearly Billing',
  'HY': 'Half-Yearly',
  '2MBX': 'Bi-Monthly + Extra',
  'MBYX': 'Monthly + Yearly',
};

// Status colors for badges
export const STATUS_VARIANTS: Record<ContractStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  'active': 'default',
  'pending': 'secondary',
  'suspended': 'secondary',
  'expired': 'outline',
  'pulled_out': 'destructive',
  'archived': 'outline',
};

// Quarterly months mapping (only for quarterly schedule types)
export const QUARTERLY_MONTHS_MAP: Record<string, number[]> = {
  'JAN-APR-JUL-OCT': [1, 4, 7, 10],
  'FEB-MAY-AUG-NOV': [2, 5, 8, 11],
  'MAR-JUN-SEP-DEC': [3, 6, 9, 12],
};

// Custom billing period configuration
export interface BillingPeriodConfig {
  code: string;
  label: string;
  color: {
    bg: string;
    text: string;
    excelBg: string;
    excelText: string;
  };
  billingLogic: {
    monthly: boolean;      // All months
    quarterly: boolean;    // Uses quarterlyMonths schedule
    halfYearly: boolean;   // Jan/Jul
    yearly: boolean;       // Jan only
    biMonthly: boolean;    // Odd months
  };
  isBuiltIn: boolean;      // true for built-in, false for custom
}

// Default built-in billing periods
export const DEFAULT_BILLING_PERIODS: BillingPeriodConfig[] = [
  {
    code: 'MB',
    label: 'Monthly Billing',
    color: { bg: 'bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', excelBg: '4472C4', excelText: 'FFFFFF' },
    billingLogic: { monthly: true, quarterly: false, halfYearly: false, yearly: false, biMonthly: false },
    isBuiltIn: true,
  },
  {
    code: 'QB',
    label: 'Quarterly Billing',
    color: { bg: 'bg-green-500/20', text: 'text-green-600 dark:text-green-400', excelBg: '70AD47', excelText: 'FFFFFF' },
    billingLogic: { monthly: false, quarterly: true, halfYearly: false, yearly: false, biMonthly: false },
    isBuiltIn: true,
  },
  {
    code: 'MBQX',
    label: 'Monthly + Quarterly',
    color: { bg: 'bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400', excelBg: '7030A0', excelText: 'FFFFFF' },
    billingLogic: { monthly: true, quarterly: true, halfYearly: false, yearly: false, biMonthly: false },
    isBuiltIn: true,
  },
  {
    code: 'QBYX',
    label: 'Quarterly + Yearly',
    color: { bg: 'bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400', excelBg: 'ED7D31', excelText: 'FFFFFF' },
    billingLogic: { monthly: false, quarterly: true, halfYearly: false, yearly: true, biMonthly: false },
    isBuiltIn: true,
  },
  {
    code: 'YB',
    label: 'Yearly Billing',
    color: { bg: 'bg-red-500/20', text: 'text-red-600 dark:text-red-400', excelBg: 'C00000', excelText: 'FFFFFF' },
    billingLogic: { monthly: false, quarterly: false, halfYearly: false, yearly: true, biMonthly: false },
    isBuiltIn: true,
  },
  {
    code: 'HY',
    label: 'Half-Yearly',
    color: { bg: 'bg-teal-500/20', text: 'text-teal-600 dark:text-teal-400', excelBg: '00B0F0', excelText: 'FFFFFF' },
    billingLogic: { monthly: false, quarterly: false, halfYearly: true, yearly: false, biMonthly: false },
    isBuiltIn: true,
  },
  {
    code: '2MBX',
    label: 'Bi-Monthly',
    color: { bg: 'bg-pink-500/20', text: 'text-pink-600 dark:text-pink-400', excelBg: 'FF66CC', excelText: 'FFFFFF' },
    billingLogic: { monthly: false, quarterly: false, halfYearly: false, yearly: false, biMonthly: true },
    isBuiltIn: true,
  },
  {
    code: 'MBYX',
    label: 'Monthly + Yearly',
    color: { bg: 'bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', excelBg: 'FFC000', excelText: '000000' },
    billingLogic: { monthly: true, quarterly: false, halfYearly: false, yearly: true, biMonthly: false },
    isBuiltIn: true,
  },
];

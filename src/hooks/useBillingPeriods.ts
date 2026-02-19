 import { useLocalStorage } from './useLocalStorage';
 import { BillingPeriodConfig, DEFAULT_BILLING_PERIODS } from '@/types/contracts';
 
 const STORAGE_KEY = 'rental_billing_periods';
 
 export function useBillingPeriods() {
   const [customPeriods, setCustomPeriods] = useLocalStorage<BillingPeriodConfig[]>(
     STORAGE_KEY,
     []
   );
 
  // Combine built-in and custom periods, filtering out built-in periods that have custom overrides
  const allPeriods: BillingPeriodConfig[] = [
    // Only include built-in periods NOT overridden by custom periods
    ...DEFAULT_BILLING_PERIODS.filter(
      (p) => !customPeriods.some((c) => c.code === p.code)
    ),
    ...customPeriods,
  ];
 
   // Add a new custom period
   const addPeriod = (period: Omit<BillingPeriodConfig, 'isBuiltIn'>) => {
     const newPeriod: BillingPeriodConfig = {
       ...period,
       isBuiltIn: false,
     };
     setCustomPeriods((prev) => [...prev, newPeriod]);
   };
 
   // Update an existing period (built-in or custom)
   const updatePeriod = (code: string, updates: Partial<BillingPeriodConfig>) => {
     // Check if it's a custom period
     const customIndex = customPeriods.findIndex((p) => p.code === code);
     if (customIndex !== -1) {
       setCustomPeriods((prev) => {
         const updated = [...prev];
         updated[customIndex] = { ...updated[customIndex], ...updates };
         return updated;
       });
     } else {
       // For built-in periods, create a custom override
       const builtIn = DEFAULT_BILLING_PERIODS.find((p) => p.code === code);
       if (builtIn) {
         const override: BillingPeriodConfig = {
           ...builtIn,
           ...updates,
           isBuiltIn: false, // Mark as customized
         };
         setCustomPeriods((prev) => [...prev, override]);
       }
     }
   };
 
   // Delete a custom period (built-in periods cannot be deleted)
   const deletePeriod = (code: string) => {
     setCustomPeriods((prev) => prev.filter((p) => p.code !== code));
   };
 
   // Get period by code
   const getPeriod = (code: string): BillingPeriodConfig | undefined => {
     // Check custom first (overrides)
     const custom = customPeriods.find((p) => p.code === code);
     if (custom) return custom;
     return DEFAULT_BILLING_PERIODS.find((p) => p.code === code);
   };
 
   // Check if a code is available
   const isCodeAvailable = (code: string): boolean => {
     return !allPeriods.some((p) => p.code.toLowerCase() === code.toLowerCase());
   };
 
   return {
     allPeriods,
     customPeriods,
     addPeriod,
     updatePeriod,
     deletePeriod,
     getPeriod,
     isCodeAvailable,
   };
 }
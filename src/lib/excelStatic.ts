// Lightweight, dependency-free helpers shared by export modules and pages.
// Kept separate from monthlyExcelExport.ts so pages that only need these
// helpers don't pull the heavy exceljs chunk into the initial bundle.
import { Contract } from '@/types/contracts';
import { isDueInMonth } from '@/lib/invoiceDateLogic';

export function getContractsDueInMonth(contracts: Contract[], month: number, year: number): Contract[] {
  return contracts.filter((contract) => isDueInMonth(contract, month, year));
}

export function getAvailableYears(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear - 5; y <= currentYear + 5; y++) {
    years.push(y);
  }
  return years;
}

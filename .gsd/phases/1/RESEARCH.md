# RESEARCH.md — Phase 1: Critical Excel Fixes

## Problem Analysis
User reports that **5th day data is missing** from the Excel export.

### Potential Causes identified in Codebase:

1.  **Type Mismatch (Most Likely)**
    - `src/types/contracts.ts` defines `InvoiceDay` as `5 | 15 | 25` (numbers).
    - `src/lib/monthlyExcelExport.ts` uses strict equality: `contracts.filter(c => c.invoiceDay === day)`.
    - If data is imported from Excel/JSON where `invoiceDay` is stored as a string `"5"`, the strict check `=== 5` fails.

2.  **Date Logic Edge Case**
    - `src/lib/invoiceDateLogic.ts` has specific logic for "Next occurrence" rule.
    - `if (monthOffset === 0 && currentDay > invoiceDay) continue;`
    - If the report is generated *after* the 5th, logic might be excluding it if not carefully scoped (though `monthlyExcelExport` usually takes a specific month/year, not "today").

### Proposed Solution
1.  **Sanitize Data**: Ensure `invoiceDay` is always cast to a number before filtering.
2.  **Reproduction**: Create a test script with a sample contract having `invoiceDay: "5"` (string) to confirm the bug.
3.  **Fix**: Update `monthlyExcelExport.ts` to handle loosely typed invoice days or ensure strict typing at the source.

### Verification Strategy
- Create a standalone test script `scripts/verify-excel-export.ts` (or similar) that mocks contracts and runs the export logic.

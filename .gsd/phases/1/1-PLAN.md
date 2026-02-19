---
phase: 1
plan: 1
wave: 1
---

# Plan 1.1: Fix Excel Export Missing Data

## Objective
Fix the critical bug where contracts due on the 5th of the month are missing from the Excel export. This is likely due to type mismatches (string "5" vs number 5) or date logic edge cases.

## Context
- `src/lib/monthlyExcelExport.ts` (Export logic)
- `src/types/contracts.ts` (Type definitions)
- `src/lib/invoiceDateLogic.ts` (Due date calculation)

## Tasks

<task type="auto">
  <name>Reproduction & Fix</name>
  <files>
    src/lib/monthlyExcelExport.ts
    src/lib/excelExport.test.ts (NEW)
  </files>
  <action>
    1. Create a reproduction test case:
       - Mock a contract with `invoiceDay` as 5 (and potentially "5" if possible to simulate raw data).
       - Verify it fails to appear in the export list.
    2. Modify `monthlyExcelExport.ts`:
       - Ensure `invoiceDay` comparisons handle potential string/number mismatches (e.g., `Number(c.invoiceDay) === day`).
       - Or sanitize input data before processing.
  </action>
  <verify>
    Run the new test case:
    `npx vitest run src/lib/excelExport.test.ts`
  </verify>
  <done>
    Test passes: Contract with invoiceDay 5 is correctly identified and included in the row count.
  </done>
</task>

## Success Criteria
- [ ] Reproducible test case created.
- [ ] 5th day contracts appear in the export logic.

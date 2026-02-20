# Project State

## Current Objectives
- Fix Excel Import 400 Bad Request error.
- Verify Supabase schema matches frontend expectations.
- Ensure `user_id` is correctly included in database operations.

## Context
- **Issue**: Excel import fails with 400 error. Screenshot suggests `quarterly_months` or general payload issue.
- **Hypothesis**:
    1. `user_id` is missing in `insert`/`upsert` payload, violating `not null` constraint.
    2. `excess_*` columns might still be missing if migration wasn't run.
    3. `quarterly_months` might be sending malformed data?
- **Codebase**: React + Vite + Supabase.

## Active Tasks
- Investigate `useContracts.ts` for payload structure.
- Check Authentication context to retrieve `user_id`.
- Update `useContracts.ts` to include `user_id`.

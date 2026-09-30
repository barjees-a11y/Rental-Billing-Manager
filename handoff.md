# Handoff — Rental Billing Manager: Device Categories Feature

## Status: migration + super-admin promotion applied to live DB; committed locally (bc91fd6); push BLOCKED (403 — stored credential `deepakt369b-droid` has no write access to `barjees-a11y/Rental-Billing-Manager`; no gh CLI installed)

### Done (all verified: `bun run build` 0 errors, `bun run test` 8/8)

**Phase 1 — device categories:**
- `supabase/add_device_categories.sql`: `contracts.category` ('copier'|'other', default 'copier'), `brand`/`model`/`serial_number` columns, global `device_brands`/`device_models` tables with super-admin RLS (security-definer `is_super_admin()`), unique indexes, seeds for "other" device types.
- Types + `useContracts.ts` keymaps (identity-map bug in `fromDbFormat` fixed), `copierStats`/`otherStats`, `useDeviceCatalog.ts` hook (super-admin-guarded writes).
- Billing page: tabs "Copier Contracts" / "Other Contracts" via `ContractListSection` (`category` prop); nav label "Billing" (route `/contracts` unchanged).
- Dashboard: "Copier Rental Contracts" + "Other Contracts" cards.
- Forms: QuickAdd + Edit have cascading Brand/Device Type → Model → Serial No + Notes; brand/model/serial/notes columns in `ContractsTableWithMonths`; exports + ImportExcel updated.

**Phase 2 — refinements:**
- QuickAdd form row order: Contract#/Customer/Machine/Period → Invoice Day/Schedule/Start Date → Brand/Model/Serial → Notes.
- Table: Brand/Model/Serial No/Notes columns moved to the end (after Q4).
- Reports page: Copier/Other top tabs (all sections category-filtered); "Exclude columns" multi-select dropdown in Monthly Export card (persisted in localStorage `reportExcludedColumns`); `exportMonthlyContractsToExcel` gained optional `excludedColumns` param; dynamic autoFilter range.
- `supabase/admin.sql` item 8: idempotent super-admin promotion snippet.

**Cleanup:**
- Purged committed machine-specific MCP configs (`.mcp.json`, `.cursor/mcp.json`, `.jetro/mcp-config.json` — all had `jetro` entry with `C:\Users\SAHARA\...` paths). Added `.kimi-code/`, `.mcp.json`, `.jetro/`, `.agent/`, `.gsd/`, `.gemini/`, `.lovable/`, `.flowbaby/`, `*.tsbuildinfo` to `.gitignore`. No secrets/JWTs found in tracked files.
- Created `.kimi-code/mcp.json` with `supabase` HTTP MCP entry (project `dvkuqzphtopophxfgjmj`).
- Stale `excelExportIntegration.test.ts` already fixed (awaits async exceljs export) — tests 8/8 green.

### Not done — TODO when user says "continue"

1. **Activate Supabase MCP**: requires a NEW session (`/new` or restart) so `.kimi-code/mcp.json` loads, then `/mcp` → supabase → OAuth login in browser.
2. **Push migration via MCP** to project `dvkuqzphtopophxfgjmj`: execute `supabase/add_device_categories.sql` as guarded/idempotent statements (it is NOT idempotent as a whole — check `contracts.category` exists before ALTER; check tables exist before CREATE).
3. **Run the admin.sql item-8 promotion snippet** for the owner's `user_id` (find via `select id, email from auth.users;`) so Device Catalog add/rename/delete buttons appear in Settings.
4. **Smoke test** (dev server + live DB): catalog buttons for super admin, exclude-dropdown persistence, Reports tabs separation, create/edit copier + other contracts, table column order.
5. **Commit & push to GitHub** (user asked earlier — staged deletions of MCP junk + modified/new feature files; `bun.lock` deletion is intentional per user).
6. Optional per user's Supabase docs: `npx skills add supabase/agent-skills`.

### Key facts to remember
- Constraints honored: billing-period logic (`invoiceDateLogic.ts`, `useBillingPeriods.ts`) untouched; universal billing schedule unchanged.
- `ContractForm.tsx` and `useSupabaseContracts.ts` are orphaned stubs; `ArchivedContracts.tsx` page has no route.
- `DeviceCatalogCard.tsx` / `useDeviceCatalog.ts` have CRLF line endings (use `\r\n` escapes when editing).
- Selects in dialogs use inline `zIndex: 10000`.
- Local DB test scripts live in `scripts/local-db-stubs.sql`, `scripts/local-db-verify.sql`, `scripts/smoke-api.mjs`.
- Plan file: `C:/Users/DK/.kimi-code/sessions/wd_rental-billing-manager_09244304d6c4/session_6a7aced5-33df-4cd9-9ad3-eaa2211ad263/agents/main/plans/red-hood-white-tiger-bobbi-morse.md`

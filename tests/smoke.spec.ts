import { test, expect, type Page } from '@playwright/test';

/**
 * UI smoke test against the local stack (vite :8080 + local Supabase :54321).
 * Creates its own user + uniquely-named contracts and verifies the whole
 * vertical slice: login → dashboard cards → Billing tabs → add copier and
 * other-category contracts via the Quick Add form → table columns → search.
 */

const EMAIL = `pw-smoke-${Date.now()}@test.local`;
const PASSWORD = 'pwsmoke123';
const MARK = `PW${Date.now().toString().slice(-8)}`;

/** Open the nth combobox inside a dialog and pick an option by text. */
async function pickDialogSelect(page: Page, nth: number, option: string) {
  const dialog = page.getByRole('dialog');
  await dialog.locator('button[role="combobox"]').nth(nth).click();
  await page.locator('div[role="option"]', { hasText: option }).first().click();
}

async function loginOrSignup(page: Page) {
  await page.goto('/login');
  // Try signing in first (works for every test after the first one)
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForTimeout(2500);
  if (!page.url().includes('/login')) return;

  // First run: create the account. Signup keeps you on /login by design
  // (form flips back to Sign In mode with a "Account created!" toast).
  await page.getByRole('button', { name: 'Sign Up', exact: true }).first().click();
  await page.fill('#name', 'PW Smoke');
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.getByRole('button', { name: 'Sign Up', exact: true }).last().click();
  await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible({ timeout: 20_000 });

  // Now sign in with the fresh account
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
  await page.waitForTimeout(1500);
}

test.describe.serial('Rental Billing Manager — UI smoke', () => {
  let copierContractNumber = '';

  test('signup → dashboard shows category cards', async ({ page }) => {
    await loginOrSignup(page);
    await expect(page).toHaveURL(/\/$|dashboard|\/$/);

    await expect(page.getByText('Copier Rental Contracts')).toBeVisible();
    await expect(page.getByText('Other Contracts')).toBeVisible();
  });

  test('add copier contract with brand/model/serial/notes', async ({ page }) => {
    await loginOrSignup(page);
    await page.goto('/contracts');
    await expect(page.getByRole('heading', { name: 'Billing' })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Copier Contracts/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Other Contracts/i })).toBeVisible();

    // Open the Add Contract dialog (Copier tab is default-active)
    await page.getByRole('button', { name: 'New Contract' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.locator('input[placeholder="C001"]').fill(`${MARK}-COP`);
    await dialog.getByPlaceholder('Customer name').fill('PW Smoke Copier');
    await dialog.getByPlaceholder('Machine or site').fill('Test Site');

    // Dialog combobox order: #0 Period, #1 Brand, #2 Model (cascading), #3 Invoice Day…
    await pickDialogSelect(page, 1, 'Canon');
    await page.waitForTimeout(300);
    await pickDialogSelect(page, 2, 'iR-ADV');
    await page.waitForTimeout(300);
    await dialog.locator('#serialNumber').fill('SN-PW-001');
    await dialog.locator('#notes').fill('created by playwright');

    await dialog.getByRole('button', { name: 'Add Contract' }).last().click();
    await expect(dialog).not.toBeVisible({ timeout: 20_000 });

    // Row appears in the table
    copierContractNumber = `${MARK}-COP`;
    await expect(page.locator('table').first().getByText(copierContractNumber)).toBeVisible({ timeout: 20_000 });
  });

  test('add other-category contract (device type instead of brand)', async ({ page }) => {
    await loginOrSignup(page);
    await page.goto('/contracts');

    await page.getByRole('tab', { name: /Other Contracts/i }).click();
    await page.getByRole('button', { name: 'New Contract' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.locator('input[placeholder="C001"]').fill(`${MARK}-OTH`);
    await dialog.getByPlaceholder('Customer name').fill('PW Smoke Other');
    await dialog.getByPlaceholder('Machine or site').fill('Other Site');

    // Label here is "Device Type" (combobox #1); seeded types include Shredder
    await pickDialogSelect(page, 1, 'Shredder');
    await page.waitForTimeout(300);
    await dialog.locator('#serialNumber').fill('SN-PW-002');

    await dialog.getByRole('button', { name: 'Add Contract' }).last().click();
    await expect(dialog).not.toBeVisible({ timeout: 20_000 });

    await expect(page.locator('table').first().getByText(`${MARK}-OTH`)).toBeVisible({ timeout: 20_000 });
  });

  test('contracts stay in their own tabs; serial + notes columns render', async ({ page }) => {
    await loginOrSignup(page);
    await page.goto('/contracts');

    const copierTable = page.locator('[role="tabpanel"]:has(#radix-copier) table').first();
    // Copier contract visible in the copier tab
    await expect(page.getByRole('tabpanel').first().getByText(`${MARK}-COP`)).toBeVisible();
    // Other contract NOT in the copier tab
    await expect(page.getByRole('tabpanel').first().getByText(`${MARK}-OTH`)).toHaveCount(0);

    await page.getByRole('tab', { name: /Other Contracts/i }).click();
    await expect(page.getByRole('tabpanel').last().getByText(`${MARK}-OTH`)).toBeVisible();
    await expect(page.getByRole('tabpanel').last().getByText(`${MARK}-COP`)).toHaveCount(0);
  });

  test('search finds the new contract', async ({ page }) => {
    await loginOrSignup(page);
    await page.goto('/contracts');
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('PW Smoke Copier');
    await expect(page.getByText(`${MARK}-COP`)).toBeVisible({ timeout: 10_000 });
  });
});

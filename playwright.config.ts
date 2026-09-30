import { defineConfig } from '@playwright/test';

// UI smoke tests run against the local dev stack:
// - vite dev server on http://127.0.0.1:8080 (npm run dev)
// - local Supabase on http://127.0.0.1:54321 (see .env.local)
export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:8080',
    channel: 'chrome', // system Chrome — no browser download needed
    headless: true,
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
  },
  reporter: [['list']],
});

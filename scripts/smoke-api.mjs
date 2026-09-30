// API smoke test against local Supabase (default http://127.0.0.1:54321).
// Usage: node scripts/smoke-api.mjs [baseUrl] [publishableKey]
// Credentials come from .env.local (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
// or the CLI args above. Exercises the same REST paths the UI uses:
// login, RLS reads, contract inserts for both categories, the user_settings
// trigger, and a super-admin catalog write. Cleans up its own test rows.
import { readFileSync } from 'node:fs';

const envFile = (() => {
  try { return readFileSync(new URL('../.env.local', import.meta.url), 'utf8'); } catch { return ''; }
})();
const env = Object.fromEntries(
  envFile.split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const BASE = (process.argv[2] || env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321').replace(/\/$/, '');
const KEY = process.argv[3] || env.VITE_SUPABASE_ANON_KEY;
if (!KEY) { console.error('No publishable key found (args or .env.local)'); process.exit(1); }

const EMAIL = 'smoke@test.local';
const PASSWORD = 'smoke1234';
const MARK = 'SMOKE-' + Date.now();
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

async function rest(path, token, method = 'GET', body, prefer) {
  const res = await fetch(`${BASE}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: prefer || (method === 'POST' ? 'return=representation' : undefined),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
  return { status: res.status, data };
}

// 1. Login (fall back to signup if the user does not exist yet)
let token;
{
  const res = await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (res.ok) {
    token = (await res.json()).access_token;
  } else {
    const signup = await fetch(`${BASE}/auth/v1/signup`, {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    if (!signup.ok) { console.error('Cannot create test user:', await signup.text()); process.exit(1); }
    token = (await signup.json()).access_token;
  }
  check('auth: login/signup', Boolean(token));
}

// 2. RLS read of the seeded device catalog (add_device_categories.sql seeds 'other' types)
{
  const { status, data } = await rest('device_brands?select=category,name&category=eq.other', token);
  const names = (data || []).map((b) => b.name);
  check('catalog: read seeded other-device types', status === 200 && names.includes('Shredder'),
    `${names.length} rows: ${names.slice(0, 5).join(', ')}`);
}

// 3. Insert a copier contract with brand/model/serial/notes
const userId = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()).sub;
{
  const { status, data } = await rest('contracts', token, 'POST', [{
    user_id: userId,
    contract_number: MARK + '-COP',
    customer: 'Smoke Customer A',
    machine_site: 'Site A',
    billing_period: 'MB',
    invoice_day: 5,
    start_date: '2026-09-01',
    status: 'active',
    category: 'copier',
    brand: 'Canon',
    model: 'iR2630',
    serial_number: 'SN-' + MARK,
    notes: 'smoke test copier',
  }]);
  check('contracts: insert copier with device fields', status === 201 && data?.[0]?.category === 'copier',
    status !== 201 ? JSON.stringify(data).slice(0, 200) : '');
}

// 4. Insert an 'other' contract (brand column stores the device type)
{
  const { status, data } = await rest('contracts', token, 'POST', [{
    user_id: userId,
    contract_number: MARK + '-OTH',
    customer: 'Smoke Customer B',
    machine_site: 'Site B',
    billing_period: 'MB',
    invoice_day: 15,
    start_date: '2026-09-01',
    status: 'active',
    category: 'other',
    brand: 'Shredder',
    model: 'DX-200',
    serial_number: 'SN-' + MARK + '-B',
    notes: 'smoke test other',
  }]);
  check('contracts: insert other-category', status === 201 && data?.[0]?.category === 'other',
    status !== 201 ? JSON.stringify(data).slice(0, 200) : '');
}

// 5. Read back filtered by category (the Billing page's two tabs)
{
  const copiers = await rest(`contracts?select=contract_number,category&category=eq.copier&contract_number=eq.${MARK}-COP`, token);
  const others = await rest(`contracts?select=contract_number,category&category=eq.other&contract_number=eq.${MARK}-OTH`, token);
  check('contracts: category filter works', copiers.data?.length === 1 && others.data?.length === 1);
}

// 6. user_settings: first-save upsert works for a brand-new user (useBillingPeriods
//    reads with maybeSingle() and upserts on save — no pre-existing row or trigger needed)
{
  const upsert = await rest('user_settings', token, 'POST', { user_id: userId, billing_periods: [] }, 'resolution=merge-duplicates,return=representation');
  const readBack = await rest(`user_settings?select=user_id&user_id=eq.${userId}`, token);
  const cleanupSettings = await rest(`user_settings?user_id=eq.${userId}`, token, 'DELETE');
  check('user_settings: first-save upsert for new user',
    upsert.status === 201 && readBack.data?.length === 1 && cleanupSettings.status === 204,
    `upsert ${upsert.status}, read ${readBack.data?.length ?? 0}, delete ${cleanupSettings.status}`);
}

// 7. Super-admin write is denied for a regular user (RLS uses user_roles.is_super_admin)
{
  const { status } = await rest('device_brands', token, 'POST', { category: 'other', name: 'SmokeProbe' });
  check('catalog: regular user cannot write (super-admin RLS)', status === 403 || status === 401, `status ${status}`);
}

// 8. Cleanup: delete this run's test contracts
{
  const del = await rest(`contracts?contract_number=in.(${MARK}-COP,${MARK}-OTH)`, token, 'DELETE');
  check('cleanup: removed test contracts', del.status >= 200 && del.status < 300, `status ${del.status}`);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);

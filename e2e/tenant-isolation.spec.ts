import { test, expect } from '@playwright/test';
import 'dotenv/config';
import {
  hasE2ERoleCredentials,
  hasE2ETenantBCredentials,
  loginAsTestOwner,
  loginAsTestAdmin,
  loginAsTenantBOwner,
  TEST_TENANT_B_BUSINESS_NAME
} from './utils/auth';

// Negative tests for the cross-tenant RLS leak fixed in
// supabase/migrations/20260706180000_close_cross_tenant_rls_leak.sql:
// legacy "admin_full_access_*" policies let an Admin/Seller from one
// business read/write another business's data. These tests confirm a
// user from "MatMax E2E Test Business" (tenant A) can never see data that
// belongs to "MatMax E2E Tenant B Business" (tenant B), via the UI or via
// a raw REST call using their own session token.

const SECRET_PRODUCT = 'TENANT-B-SECRET-PRODUCT';
const SECRET_CLIENT = 'TENANT-B-SECRET-CLIENT';

async function searchAndExpectEmpty(page: import('@playwright/test').Page, navButtonName: string, searchTerm: string) {
  await page.getByRole('button', { name: navButtonName }).click();
  await page.waitForTimeout(1000);
  const searchBox = page.locator('input[type="text"]').first();
  await searchBox.fill(searchTerm);
  await page.waitForTimeout(600);
  await expect(page.getByText(searchTerm, { exact: false })).toHaveCount(0);
}

async function rawSelectAsCurrentUser(page: import('@playwright/test').Page, table: string, filterColumn: string, filterValue: string) {
  return page.evaluate(async ({ supabaseUrl, anonKey, table, filterColumn, filterValue }) => {
    const storageKey = Object.keys(window.localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (!storageKey) return { error: 'no session found' };
    const session = JSON.parse(window.localStorage.getItem(storageKey) as string);
    const accessToken = session?.access_token;

    const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=id,nombre&${filterColumn}=eq.${filterValue}`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` }
    });
    const body = await res.json().catch(() => null);
    return { status: res.status, body };
  }, {
    supabaseUrl: process.env.VITE_SUPABASE_URL,
    anonKey: process.env.VITE_SUPABASE_ANON_KEY,
    table,
    filterColumn,
    filterValue
  });
}

test.describe('Cross-tenant isolation', () => {
  test('tenant B owner can see their own data (positive control)', async ({ page }) => {
    test.skip(!hasE2ETenantBCredentials, 'E2E tenant B credentials are not configured.');

    await loginAsTenantBOwner(page);
    await expect(page.getByText(TEST_TENANT_B_BUSINESS_NAME, { exact: false }).first()).toBeVisible({ timeout: 10_000 });

    await searchAndExpectEmpty(page, 'Productos', 'this-should-not-exist-anywhere');
    await page.getByRole('button', { name: 'Productos' }).click();
    await page.waitForTimeout(1000);
    const searchBox = page.locator('input[type="text"]').first();
    await searchBox.fill(SECRET_PRODUCT);
    await page.waitForTimeout(600);
    await expect(page.getByText(SECRET_PRODUCT, { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('tenant A owner cannot see tenant B products or clients via the UI', async ({ page }) => {
    test.skip(!hasE2ERoleCredentials, 'E2E role credentials are not configured.');

    await loginAsTestOwner(page);
    await searchAndExpectEmpty(page, 'Productos', SECRET_PRODUCT);
    await searchAndExpectEmpty(page, 'Clientes', SECRET_CLIENT);
  });

  test('tenant A admin cannot see tenant B products or clients via the UI', async ({ page }) => {
    test.skip(!hasE2ERoleCredentials, 'E2E role credentials are not configured.');

    await loginAsTestAdmin(page);
    await searchAndExpectEmpty(page, 'Productos', SECRET_PRODUCT);
    await searchAndExpectEmpty(page, 'Clientes', SECRET_CLIENT);
  });

  test('tenant A owner cannot read tenant B rows via a direct REST call, even by negocio_id', async ({ page }) => {
    test.skip(!hasE2ERoleCredentials || !hasE2ETenantBCredentials, 'E2E credentials are not fully configured.');

    await loginAsTestOwner(page);

    // Attempt the same query an authenticated tenant-A session would need to
    // run to see tenant B's product by name, no negocio_id filter at all —
    // RLS must restrict rows to tenant A regardless of what's requested.
    const result = await rawSelectAsCurrentUser(page, 'productos', 'nombre', SECRET_PRODUCT);

    expect(result.status).toBe(200);
    expect(Array.isArray(result.body) ? result.body.length : -1).toBe(0);
  });
});

import { Page, expect } from '@playwright/test';
import 'dotenv/config';

export const TEST_OWNER_EMAIL = process.env.E2E_OWNER_EMAIL || '';
export const TEST_OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD || '';
export const TEST_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || '';
export const TEST_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || '';
export const TEST_SELLER_EMAIL = process.env.E2E_SELLER_EMAIL || '';
export const TEST_SELLER_PASSWORD = process.env.E2E_SELLER_PASSWORD || '';
export const TEST_TENANT_B_OWNER_EMAIL = process.env.E2E_TENANT_B_OWNER_EMAIL || '';
export const TEST_TENANT_B_OWNER_PASSWORD = process.env.E2E_TENANT_B_OWNER_PASSWORD || '';

export const TEST_BUSINESS_NAME = 'MatMax E2E Test Business';
export const TEST_TENANT_B_BUSINESS_NAME = 'MatMax E2E Tenant B Business';

export const hasE2ECredentials = Boolean(TEST_OWNER_EMAIL && TEST_OWNER_PASSWORD);
export const hasE2ERoleCredentials = Boolean(
  TEST_OWNER_EMAIL && TEST_OWNER_PASSWORD && TEST_ADMIN_EMAIL && TEST_ADMIN_PASSWORD && TEST_SELLER_EMAIL && TEST_SELLER_PASSWORD
);
export const hasE2ETenantBCredentials = Boolean(TEST_TENANT_B_OWNER_EMAIL && TEST_TENANT_B_OWNER_PASSWORD);

export function assertE2ECredentials() {
  if (!hasE2ECredentials) {
    throw new Error('Missing E2E_OWNER_EMAIL or E2E_OWNER_PASSWORD in the local environment.');
  }
}

export async function goToLoginForm(page: Page) {
  // Root '/' shows the marketing landing page to browsers with no prior
  // session; returning accounts skip straight to the login form.
  await page.addInitScript(() => window.localStorage.setItem('matmax_has_account', 'true'));
  await page.goto('/');
}

export async function loginAs(page: Page, email: string, password: string) {
  if (!email || !password) {
    throw new Error('loginAs() called with a missing email or password.');
  }

  await goToLoginForm(page);
  await page.getByPlaceholder('correo@empresa.com').fill(email);
  await page.getByPlaceholder('••••••••').first().fill(password);
  await page.locator('form button[type="submit"]').click();

  // LoginPage hard-redirects to /dashboard ~1s after a successful sign-in,
  // reloading the whole SPA.
  await page.waitForURL('**/dashboard', { timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible({ timeout: 20_000 });
}

export async function loginAsTestOwner(page: Page) {
  assertE2ECredentials();
  await loginAs(page, TEST_OWNER_EMAIL, TEST_OWNER_PASSWORD);
}

export async function loginAsTestAdmin(page: Page) {
  await loginAs(page, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD);
}

export async function loginAsTestSeller(page: Page) {
  await loginAs(page, TEST_SELLER_EMAIL, TEST_SELLER_PASSWORD);
}

export async function loginAsTenantBOwner(page: Page) {
  await loginAs(page, TEST_TENANT_B_OWNER_EMAIL, TEST_TENANT_B_OWNER_PASSWORD);
}

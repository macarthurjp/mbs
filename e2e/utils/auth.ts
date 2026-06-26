import { Page, expect } from '@playwright/test';

export const TEST_OWNER_EMAIL = 'e2e-test-owner@example.com';
export const TEST_OWNER_PASSWORD = 'E2eTest!2026Matmax';
export const TEST_BUSINESS_NAME = 'MatMax E2E Test Business';

export async function loginAsTestOwner(page: Page) {
  await page.goto('/');
  await page.getByPlaceholder('correo@empresa.com').fill(TEST_OWNER_EMAIL);
  await page.getByPlaceholder('••••••••').first().fill(TEST_OWNER_PASSWORD);
  await page.locator('form button[type="submit"]').click();

  // LoginPage hard-redirects to /dashboard ~1s after a successful sign-in,
  // reloading the whole SPA.
  await page.waitForURL('**/dashboard', { timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible({ timeout: 20_000 });
}

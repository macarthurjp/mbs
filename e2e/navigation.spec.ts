import { test, expect } from '@playwright/test';
import { hasE2ECredentials, loginAsTestOwner } from './utils/auth';

test.describe('Authenticated navigation', () => {
  test('owner can navigate to Sales, Clients and Products', async ({ page }) => {
    test.skip(!hasE2ECredentials, 'E2E owner credentials are not configured.');

    await loginAsTestOwner(page);

    await page.getByRole('button', { name: 'Ventas' }).click();
    await expect(page.getByRole('heading', { name: 'Ventas', level: 1 })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Clientes' }).click();
    await expect(page.getByRole('heading', { name: 'Clientes' }).first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Productos' }).click();
    await expect(page.getByRole('heading', { name: 'Productos' }).first()).toBeVisible({ timeout: 10_000 });
  });
});

import { test, expect } from '@playwright/test';
import { loginAsTestOwner, TEST_BUSINESS_NAME } from './utils/auth';

test.describe('Authenticated dashboard', () => {
  test('owner logs in and lands on the business dashboard', async ({ page }) => {
    await loginAsTestOwner(page);

    await expect(page.getByText(TEST_BUSINESS_NAME).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Ventas' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clientes' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Productos' })).toBeVisible();
  });
});

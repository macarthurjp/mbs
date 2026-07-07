import { test, expect } from '@playwright/test';
import { hasE2ERoleCredentials, loginAsTestOwner, loginAsTestAdmin, loginAsTestSeller } from './utils/auth';

// Confirms the owner-only cost/supplier restriction added in
// 20260706190000_owner_only_cost_supplier.sql (and the two follow-up fix
// migrations) actually holds at the UI level for every role, and that the
// existing seller/admin page-level restrictions haven't regressed.

test.describe('Role-based permissions', () => {
  test('owner sees cost and supplier on Products', async ({ page }) => {
    test.skip(!hasE2ERoleCredentials, 'E2E role credentials are not configured.');

    await loginAsTestOwner(page);
    await page.getByRole('button', { name: 'Productos' }).click();
    await expect(page.getByText('Nuevo Producto')).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText('Costo').first()).toBeVisible();
  });

  test('admin cannot see cost or supplier on Products', async ({ page }) => {
    test.skip(!hasE2ERoleCredentials, 'E2E role credentials are not configured.');

    await loginAsTestAdmin(page);
    await page.getByRole('button', { name: 'Productos' }).click();
    await expect(page.getByText('Nuevo Producto')).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText('Costo')).toHaveCount(0);
    await expect(page.getByText(/Proveedor:/)).toHaveCount(0);
  });

  test('seller cannot see cost or supplier on Products', async ({ page }) => {
    test.skip(!hasE2ERoleCredentials, 'E2E role credentials are not configured.');

    await loginAsTestSeller(page);
    await page.getByRole('button', { name: 'Productos' }).click();
    await page.waitForTimeout(1000);

    await expect(page.getByText('Costo')).toHaveCount(0);
    await expect(page.getByText(/Proveedor:/)).toHaveCount(0);
  });

  test('seller does not even see Compras or Cuentas por cobrar in the sidebar', async ({ page }) => {
    test.skip(!hasE2ERoleCredentials, 'E2E role credentials are not configured.');

    // Sidebar.tsx filters these nav items out entirely for sellers (rather
    // than showing a clickable link to a "restricted" screen) — assert the
    // stronger property that they're absent, not just that a click is blocked.
    await loginAsTestSeller(page);
    await expect(page.getByRole('button', { name: 'Compras' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Cuentas por cobrar' })).toHaveCount(0);
  });

  test('admin can access Compras and Cuentas por cobrar', async ({ page }) => {
    test.skip(!hasE2ERoleCredentials, 'E2E role credentials are not configured.');

    await loginAsTestAdmin(page);

    await page.getByRole('button', { name: 'Compras' }).click();
    await expect(page.getByRole('button', { name: 'Nueva Compra' })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Cuentas por cobrar' }).click();
    await expect(page.getByText('Acceso restringido')).toHaveCount(0);
  });

  test('owner sees estimated profit on Reports', async ({ page }) => {
    test.skip(!hasE2ERoleCredentials, 'E2E role credentials are not configured.');

    await loginAsTestOwner(page);
    await page.getByRole('button', { name: 'Reportes' }).click();
    await expect(page.getByText('Ganancia estimada')).toBeVisible({ timeout: 10_000 });
  });

  test('admin does not see estimated profit on Reports', async ({ page }) => {
    test.skip(!hasE2ERoleCredentials, 'E2E role credentials are not configured.');

    await loginAsTestAdmin(page);
    await page.getByRole('button', { name: 'Reportes' }).click();
    await page.waitForTimeout(1000);
    await expect(page.getByText('Ganancia estimada')).toHaveCount(0);
  });
});

import { test, expect } from '@playwright/test';
import { hasE2ECredentials, loginAsTestOwner } from './utils/auth';

test.describe('Sales money flow', () => {
  test('owner creates a product and completes a cash sale', async ({ page }) => {
    test.skip(!hasE2ECredentials, 'E2E owner credentials are not configured.');

    await loginAsTestOwner(page);

    const productName = `E2E Test Product ${Date.now()}`;

    await page.getByRole('button', { name: 'Productos' }).click();
    await expect(page.getByRole('heading', { name: 'Productos' }).first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Nuevo Producto' }).click();

    const productForm = page.locator('form').filter({ has: page.getByRole('button', { name: 'Crear Producto' }) });
    const formInputs = productForm.locator('input');

    await formInputs.nth(0).fill(productName); // Nombre del Producto
    await formInputs.nth(2).fill('9.99'); // Precio
    await formInputs.nth(4).fill('100'); // Stock actual
    await formInputs.nth(5).fill('1'); // Stock mínimo

    await page.getByRole('button', { name: 'Crear Producto' }).click();
    await expect(productForm).toBeHidden({ timeout: 10_000 });
    await expect(page.getByText(productName).first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Ventas' }).click();
    await expect(page.getByRole('heading', { name: 'Ventas', level: 1 })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: new RegExp(productName) }).click();
    await page.getByRole('button', { name: /^Cobrar/ }).click();

    await expect(page.getByRole('heading', { name: 'Confirmar venta' })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Registrar venta' }).click();

    await expect(page.getByRole('button', { name: 'Imprimir recibo' })).toBeVisible({ timeout: 15_000 });
  });
});

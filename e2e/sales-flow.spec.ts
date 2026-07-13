import { test, expect } from '@playwright/test';
import { hasE2ECredentials, loginAsTestOwner } from './utils/auth';

test.describe('Sales money flow', () => {
  test('owner creates a product, completes a cash sale, and reprints its receipt', async ({ page, context }) => {
    test.skip(!hasE2ECredentials, 'E2E owner credentials are not configured.');

    await context.addInitScript(() => {
      window.print = () => {
        document.documentElement.dataset.printCalled = 'true';
      };
    });

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
    const quantityInput = page.getByLabel(`Cant.: ${productName}`);
    await quantityInput.fill('20');
    await expect(quantityInput).toHaveValue('20');
    await page.getByRole('button', { name: /^Cobrar/ }).click();

    await expect(page.getByRole('heading', { name: 'Confirmar venta' })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Registrar venta' }).click();

    const printReceiptButton = page.getByRole('button', { name: 'Imprimir recibo' });
    await expect(printReceiptButton).toBeVisible({ timeout: 15_000 });

    const saleCode = await page.locator('h2').filter({ hasText: /^V-\d+$/ }).textContent();
    expect(saleCode).toMatch(/^V-\d+$/);

    const immediatePopupPromise = page.waitForEvent('popup');
    await printReceiptButton.click();
    const immediateReceipt = await immediatePopupPromise;
    await expect(immediateReceipt.getByText(productName)).toBeVisible();
    await expect(immediateReceipt.locator('html')).toHaveAttribute('data-print-called', 'true');
    await immediateReceipt.close();

    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await page.getByRole('button', { name: 'Facturas' }).click();
    await expect(page.getByRole('heading', { name: 'Facturas', level: 1 })).toBeVisible({ timeout: 10_000 });

    const saleId = Number(saleCode?.replace('V-', ''));
    const invoiceCode = `FAC-${String(saleId).padStart(6, '0')}`;
    // The search box matches the raw sale id (see InvoicesPage's
    // matchesSearch), not the formatted "FAC-000098" invoice code.
    await page.getByPlaceholder('Buscar por número, cliente, fecha o tipo de pago...').fill(String(saleId));
    await page.getByRole('button', { name: 'Ver' }).first().click();

    const reprintButton = page.getByRole('button', { name: 'Imprimir recibo' });
    await expect(reprintButton).toBeEnabled({ timeout: 10_000 });
    const historicalPopupPromise = page.waitForEvent('popup');
    await reprintButton.click();
    const historicalReceipt = await historicalPopupPromise;
    await expect(historicalReceipt.getByText(productName)).toBeVisible();
    await expect(historicalReceipt.getByText('20', { exact: true })).toBeVisible();
    await expect(historicalReceipt.locator('html')).toHaveAttribute('data-print-called', 'true');
    await historicalReceipt.close();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar PDF' }).click();
    const invoiceDownload = await downloadPromise;
    expect(invoiceDownload.suggestedFilename()).toBe(`${invoiceCode}.pdf`);
  });
});

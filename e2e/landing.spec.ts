import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test('renders the marketing page at /landing', async ({ page }) => {
    await page.goto('/landing');

    await expect(page.getByRole('heading', { name: 'MatMax Business Suite' })).toBeVisible();
    await expect(page.getByText('Gestión - Precisión - Elegancia')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Empezar ahora' })).toBeVisible();
  });

  test('"Crear cuenta" sends the visitor to the login/signup form', async ({ page }) => {
    await page.goto('/landing');

    await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();

    await expect(page.getByPlaceholder('correo@empresa.com')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  });

  test('language toggle switches the page to English', async ({ page }) => {
    await page.goto('/landing');

    await page.getByRole('button', { name: 'EN', exact: true }).first().click();

    await expect(page.getByText('Management - Precision - Elegance')).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import { assertE2ECredentials, goToLoginForm, TEST_OWNER_EMAIL, TEST_OWNER_PASSWORD } from './utils/auth';

test.describe('Login page', () => {
  test('clicking through from the landing page reaches the login form and remembers the account on logout', async ({ page }) => {
    assertE2ECredentials();

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'MatMax Business Suite' })).toBeVisible();

    await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
    await expect(page.getByPlaceholder('correo@empresa.com')).toBeVisible({ timeout: 10_000 });

    await page.getByPlaceholder('correo@empresa.com').fill(TEST_OWNER_EMAIL);
    await page.getByPlaceholder('••••••••').first().fill(TEST_OWNER_PASSWORD);
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 20_000 });

    const flag = await page.evaluate(() => window.localStorage.getItem('matmax_has_account'));
    expect(flag).toBe('true');

    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await page.waitForTimeout(1500);

    await page.goto('/');
    await expect(page.getByPlaceholder('correo@empresa.com')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  });


  test('first-time visitors land on the landing page, not the login form', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'MatMax Business Suite' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Empezar ahora' })).toBeVisible();
  });

  test('returning visitors (known account on this browser) land on the sign-in form directly', async ({ page }) => {
    await goToLoginForm(page);

    await expect(page.getByPlaceholder('correo@empresa.com')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
    await expect(page.getByText('MatMax Business Suite').first()).toBeVisible();
  });

  test('switching to "Crear cuenta" reveals the confirm-password field', async ({ page }) => {
    await goToLoginForm(page);

    await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();

    await expect(page.getByText('Confirmar Contraseña')).toBeVisible();
  });

  test('"¿Olvidaste tu contraseña?" switches to the recovery form', async ({ page }) => {
    await goToLoginForm(page);

    await page.getByRole('button', { name: '¿Olvidaste tu contraseña?' }).click();

    await expect(page.getByRole('heading', { name: 'Recuperar contraseña' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enviar enlace de recuperación' })).toBeVisible();
  });

  test('shows an error for invalid credentials instead of granting access', async ({ page }) => {
    await goToLoginForm(page);

    await page.getByPlaceholder('correo@empresa.com').fill('e2e-nonexistent-user@matmax.test');
    await page.getByPlaceholder('••••••••').first().fill('not-the-right-password');
    await page.locator('form button[type="submit"]').click();

    await expect(page.getByText('MatMax Business Suite').first()).toBeVisible();
    await expect(page.locator('p.text-red-800')).toBeVisible({ timeout: 15_000 });
  });
});

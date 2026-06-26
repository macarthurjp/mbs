import { test, expect } from '@playwright/test';

test.describe('Reset password page', () => {
  test('renders directly at /reset-password without requiring login', async ({ page }) => {
    await page.goto('/reset-password');

    await expect(page.getByRole('heading', { name: 'Crear nueva contraseña' }).first()).toBeVisible();
    await expect(page.getByPlaceholder('••••••••').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Volver a iniciar sesión' })).toBeVisible();
  });

  test('shows the invalid-link error when there is no recovery session', async ({ page }) => {
    await page.goto('/reset-password');

    await expect(
      page.getByText('No se pudo validar el enlace de recuperación', { exact: false })
    ).toBeVisible({ timeout: 10_000 });
  });
});

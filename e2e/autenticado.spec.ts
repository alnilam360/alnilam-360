import { test, expect } from '@playwright/test';

const email = process.env['E2E_EMAIL'];
const password = process.env['E2E_PASSWORD'];

test.skip(!email || !password, 'Requiere E2E_EMAIL/E2E_PASSWORD');

test('login real, dashboard y navegación a Presupuesto', async ({ page }) => {
  await page.goto('/auth');
  await page.getByPlaceholder('correo@empresa.com').fill(email!);
  await page.getByPlaceholder('••••••••').fill(password!);
  await page.getByRole('button', { name: /Iniciar Sesión/ }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto('/presupuesto/resumen');
  await expect(page).toHaveURL(/\/presupuesto/);
  await expect(page.getByText('Resumen del mes')).toBeVisible();
});

import { test, expect } from '@playwright/test';

test('la app carga y redirige a login sin sesión', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/auth/);
});

test('la pantalla de login muestra email y contraseña', async ({ page }) => {
  await page.goto('/auth');
  await expect(page.getByPlaceholder('correo@empresa.com')).toBeVisible();
  await expect(page.getByPlaceholder('••••••••')).toBeVisible();
  await expect(page.getByRole('button', { name: /Iniciar Sesión/ })).toBeVisible();
});

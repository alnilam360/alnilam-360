import { test, expect } from '@playwright/test';

test('sin sesión, una ruta protegida redirige a /auth', async ({ page }) => {
  await page.goto('/presupuesto/resumen');
  await expect(page).toHaveURL(/.*auth.*/);
});

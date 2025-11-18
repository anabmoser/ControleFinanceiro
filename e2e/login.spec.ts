import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Controle Financeiro')).toBeVisible();
    await expect(page.getByPlaceholder('seu@email.com')).toBeVisible();
    await expect(page.getByPlaceholder('Sua senha')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/');

    await page.getByPlaceholder('seu@email.com').fill('invalid@test.com');
    await page.getByPlaceholder('Sua senha').fill('wrongpassword');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByText(/erro/i)).toBeVisible();
  });

  test('should toggle between login and register', async ({ page }) => {
    await page.goto('/');

    await page.getByText('Criar conta').click();
    await expect(page.getByRole('button', { name: 'Cadastrar' })).toBeVisible();

    await page.getByText('Já tem uma conta?').click();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  });
});

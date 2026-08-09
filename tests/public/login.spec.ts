import { test, expect } from '../../fixtures';

test.describe('Login page', () => {
  test('shows username, password, and submit button', async ({ loginPage, page }) => {
    await loginPage.goto();
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  });

  test('shows an error on invalid credentials', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login('wronguser', 'wrongpassword');
    await expect(loginPage.alert).toContainText('Invalid username or password');
  });

  test('redirects an unauthenticated visit to a protected route to /login', async ({ page }) => {
    await page.goto('/admin/courses');
    await expect(page).toHaveURL(/\/login/);
  });
});

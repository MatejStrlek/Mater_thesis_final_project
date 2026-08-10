import { test, expect } from '../../fixtures';

test.describe('Login page', () => {
  test('shows username, password, and submit button', async ({ loginPage }) => {
    await loginPage.goto();
    await expect(loginPage.usernameInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('shows an error on invalid credentials', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login('wronguser', 'wrongpassword');
    await expect(loginPage.alert).toContainText('Invalid username or password');
  });

  test('redirects an unauthenticated visit to a protected route to /login', async ({ page, adminCoursesPage }) => {
    await adminCoursesPage.goto();
    await expect(page).toHaveURL(/\/login/);
  });
});

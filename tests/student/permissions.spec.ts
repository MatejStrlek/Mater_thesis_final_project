import { test, expect } from '../../fixtures';

test('student cannot access an admin-only route', async ({ page, adminCoursesPage }) => {
  await adminCoursesPage.goto();
  await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible();
});
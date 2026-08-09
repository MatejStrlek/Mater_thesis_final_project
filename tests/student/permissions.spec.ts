import { test, expect } from '../../fixtures';

test('student cannot access an admin-only route', async ({ page }) => {
  await page.goto('/admin/courses');
  await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible();
});
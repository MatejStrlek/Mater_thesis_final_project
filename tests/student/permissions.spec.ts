import { test, expect } from '../../fixtures';

/**
 * Every role-guarded MVC route shares one CustomAccessDeniedHandler
 * (SecurityConfig), so a student hitting any admin- or professor-only
 * route renders the same "Access Denied" page (error/403.html) regardless
 * of which route it was. That uniform behavior is what makes this a good
 * data-driven table instead of one hardcoded route: each row is a real,
 * independent boundary check, not a copy-pasted assertion.
 */
const blockedRoutes = [
  { path: '/admin/dashboard', label: 'admin dashboard' },
  { path: '/admin/courses', label: 'admin course list' },
  { path: '/admin/users', label: 'admin user management' },
  { path: '/admin/schedule', label: 'admin schedule' },
  { path: '/professor/courses', label: 'professor course list' },
  { path: '/professor/schedule', label: 'professor schedule' },
] as const;

for (const { path, label } of blockedRoutes) {
  test(`student is blocked from the ${label} (${path})`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible();
  });
}

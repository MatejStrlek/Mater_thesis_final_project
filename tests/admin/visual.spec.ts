import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../../fixtures';
import { unexpectedViolations } from '../../utils/axe';

test.describe('Admin users — visual & accessibility', () => {
  // /admin/users, unlike /admin/courses, isn't touched by any mutating spec
  // in this suite (no test creates/edits/deletes a user), so its table
  // content is stable regardless of what else ran this worker cycle.
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/users');
    // Guards against silently baselining an error page — see
    // tests/professor/visual.spec.ts for why this matters (it's how a real
    // 500 bug on the schedule pages went unnoticed for a while).
    await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();
  });

  test('matches its visual baseline', async ({ page }) => {
    await expect(page).toHaveScreenshot('admin-users.png', { animations: 'disabled' });
  });

  test('has no unexpected accessibility violations', async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze();
    expect(unexpectedViolations(results.violations)).toEqual([]);
  });
});

test.describe('Admin dashboard — visual', () => {
  test('matches its visual baseline, with live stat counts masked', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();

    // The 4 stat cards (users/roles/courses/enrollments) are genuinely
    // live-updating: this same suite's own admin/courses.spec.ts and
    // student/courses.spec.ts create and enroll/drop real rows concurrently,
    // so the counts vary run to run. Masking them is what keeps this
    // baseline meaningful instead of flaking on every parallel run.
    await expect(page).toHaveScreenshot('admin-dashboard.png', {
      animations: 'disabled',
      mask: [page.locator('.card-body strong')],
    });
  });
});

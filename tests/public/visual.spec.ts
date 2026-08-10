import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../../fixtures';
import { unexpectedViolations } from '../../utils/axe';

test.describe('Login page — visual & accessibility', () => {
  test.beforeEach(async ({ loginPage, page }) => {
    await loginPage.goto();
    // Guards against silently baselining an error page: a screenshot or axe
    // scan can't tell a real page from a 500 page on its own (both are
    // valid, stable markup) — a ScheduleController view-name typo caught
    // this exact gap once already on the professor schedule page.
    await expect(page.getByRole('heading', { name: 'University Login' })).toBeVisible();
  });

  test('matches its visual baseline', async ({ page }) => {
    await expect(page).toHaveScreenshot('login.png', { animations: 'disabled' });
  });

  test('has no unexpected accessibility violations', async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze();
    expect(unexpectedViolations(results.violations)).toEqual([]);
  });
});

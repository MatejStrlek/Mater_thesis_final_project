import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../../fixtures';
import { unexpectedViolations } from '../../utils/axe';

test.describe('Professor schedule — visual & accessibility', () => {
  // No spec in this suite creates/edits/deletes schedule entries, so this
  // page's content is stable regardless of what else ran this worker cycle.
  test.beforeEach(async ({ page }) => {
    await page.goto('/professor/schedule');
    // Guards against silently baselining an error page: a screenshot or axe
    // scan can't tell a real page from a 500 page on its own (both are
    // valid, stable markup) — this caught a real bug once already (a
    // ScheduleController view-name typo made this exact route 500 for a
    // while, and both checks below "passed" against the error page anyway).
    await expect(page.getByRole('heading', { name: 'My Schedule' })).toBeVisible();
  });

  test('matches its visual baseline', async ({ page }) => {
    await expect(page).toHaveScreenshot('professor-schedule.png', { animations: 'disabled' });
  });

  test('has no unexpected accessibility violations', async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze();
    expect(unexpectedViolations(results.violations)).toEqual([]);
  });
});

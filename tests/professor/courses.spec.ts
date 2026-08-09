import { test, expect } from '../../fixtures';

test.describe('Professor course list', () => {
  test('shows only courses the professor teaches', async ({ professorCoursesPage }) => {
    await professorCoursesPage.goto();
    await expect(professorCoursesPage.courseRow('CS101')).toBeVisible();
    // BIO101 belongs to a different professor (aradovan) — must not leak into mkrmpotic's list.
    await expect(professorCoursesPage.courseRow('BIO101')).toHaveCount(0);
  });

  test('redirects with an unauthorized error when accessing another professor\'s roster', async ({ page }) => {
    // Course 6 (BIO101) belongs to aradovan, not the logged-in professor (mkrmpotic).
    await page.goto('/professor/courses/6/students');
    await expect(page).toHaveURL(/error=unauthorized/);
  });
});
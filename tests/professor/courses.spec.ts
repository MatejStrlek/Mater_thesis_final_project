import { test, expect } from '../../fixtures';
import { course } from '../../utils/test-data';

test.describe('Professor course list', () => {
  test('shows only courses the professor teaches', async ({ professorCoursesPage }) => {
    await professorCoursesPage.goto();
    await expect(professorCoursesPage.courseRow(course.cs101)).toBeVisible();
    await expect(professorCoursesPage.courseRow(course.bio101)).toHaveCount(0);
  });

  test('redirects with an unauthorized error when accessing another professor\'s roster', async ({ page }) => {
    // Course 6 = BIO101, which belongs to aradovan, not the logged-in professor (mkrmpotic).
    await page.goto('/professor/courses/6/students');
    await expect(page).toHaveURL(/error=unauthorized/);
  });
});

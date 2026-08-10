import { test, expect } from '../../fixtures';
import { course } from '../../utils/test-data';

test.describe('Student enrollment under an edge-case backend response', () => {
  // Reproducing "course at max capacity" for real means enrolling students
  // up to max_students (90 for BIO101) — slow and pointless just to exercise
  // this one error path, so the enroll POST is mocked instead. The body
  // mirrors templates/error/400.html (heading "400" + the errorMessage span),
  // which GlobalExceptionHandler renders for an IllegalArgumentException.
  test('shows the capacity error without actually filling the course', async ({ page, studentCoursesPage }) => {
    await page.route('**/student/courses/enroll/*', (route) =>
      route.fulfill({
        status: 400,
        contentType: 'text/html',
        body: '<html><body><h1>400</h1><h2>Bad Request</h2><div class="alert"><span>This course has reached its maximum enrollment capacity.</span></div></body></html>',
      })
    );

    await studentCoursesPage.goto();
    await studentCoursesPage.enroll(course.bio101);

    await expect(page.getByRole('heading', { name: '400' })).toBeVisible();
    await expect(page.getByText('This course has reached its maximum enrollment capacity.')).toBeVisible();
  });
});

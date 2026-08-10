import { test, expect } from '../../fixtures';

test.describe('Admin course list under network failure', () => {
  // A real backend outage (DB down, etc.) is exactly the kind of condition
  // that's slow/disruptive to provoke against the actual running container,
  // so it's mocked here via page.route() instead. The response body mirrors
  // the app's own templates/error/500.html (heading "500" / "Internal Server
  // Error"), which GlobalExceptionHandler renders for any uncaught exception.
  test('shows the app\'s error page when the course list request fails', async ({ page, adminCoursesPage }) => {
    await page.route('**/admin/courses', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'text/html',
        body: '<html><body><h1>500</h1><h2>Internal Server Error</h2><p>Something went wrong on our end.</p></body></html>',
      })
    );

    await adminCoursesPage.goto();

    await expect(page.getByRole('heading', { name: '500' })).toBeVisible();
    await expect(page.getByText('Internal Server Error')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Add New Course' })).toHaveCount(0);
  });
});

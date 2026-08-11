import { test, expect } from '../../fixtures';
import { courseId, primaryUsers } from '../../utils/test-data';

/**
 * Viewing course content is inherently cross-role: only an admin/professor
 * can create it, only a student's own session proves it's actually visible
 * to that role. This lives in the `shared` project (fresh logins, no fixed
 * storageState) rather than tests/student/, and deliberately does the whole
 * admin-create → student-view → admin-cleanup flow as one sequential test
 * on a single page (logging out between roles) instead of mixing an
 * isolated API context with a live page of a different role — that exact
 * pattern (even confined to beforeAll/afterAll, no page overlap) reliably
 * broke the student page's session when tried here, matching CLAUDE.md's
 * known quirk #5 (root cause never pinned down; the working mitigation is
 * to just not interleave roles within the same test lifecycle at all).
 *
 * MATH301 (courseId.math301) is used because no other spec manages content
 * on it — admin/professor content CRUD specs use CS101.
 */
test.describe('Student course content viewing', () => {
  const body = 'Test lecture body for the student content-viewing spec.';

  test('admin publishes content, then a student can view it', async ({
    page,
    loginPage,
    adminCourseContentPage,
    studentCourseContentPage,
  }) => {
    // Suffixed per test execution (not module load) so repeated/concurrent
    // runs against the same container never collide on title.
    const title = `E2E Student-Visible Lecture ${Date.now()}`;

    await test.step('Admin creates and publishes a content item', async () => {
      await loginPage.goto();
      await loginPage.login(primaryUsers.admin.username, primaryUsers.admin.password);
      await loginPage.expectLoggedIn();

      await adminCourseContentPage.createContent(courseId.math301, {
        title,
        contentType: 'LECTURE',
        content: body,
      });
      await adminCourseContentPage.togglePublish(courseId.math301, title);
      await adminCourseContentPage.logout();
    });

    await test.step('Student sees the published content in the list', async () => {
      await loginPage.goto();
      await loginPage.login(primaryUsers.student.username, primaryUsers.student.password);
      await loginPage.expectLoggedIn();

      await studentCourseContentPage.goto(courseId.math301);
      await studentCourseContentPage.expectContentVisible(title);
    });

    await test.step('Student opens the content item and sees its body', async () => {
      await studentCourseContentPage.viewContent(title);
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
      await expect(page.getByTestId('content-body')).toContainText(body);
      await studentCourseContentPage.logout();
    });

    await test.step('Admin deletes the content item', async () => {
      await loginPage.goto();
      await loginPage.login(primaryUsers.admin.username, primaryUsers.admin.password);
      await loginPage.expectLoggedIn();
      await adminCourseContentPage.deleteContent(courseId.math301, title);
    });
  });
});

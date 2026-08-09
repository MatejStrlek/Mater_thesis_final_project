import { test } from '../../fixtures';
import { course } from '../../utils/test-data';

test.describe('Student course enrollment', () => {
  test('can enroll in an available course', async ({ studentCoursesPage, studentEnrollmentsPage }) => {
    await studentCoursesPage.goto();
    await studentCoursesPage.enroll(course.phy201);

    await studentEnrollmentsPage.goto();
    await studentEnrollmentsPage.expectEnrolled(course.phy201);

    // leave the world as found, so this test is safe to re-run
    await studentEnrollmentsPage.drop(course.phy201);
  });

  test('can drop an enrolled course', async ({ studentCoursesPage, studentEnrollmentsPage }) => {
    await studentCoursesPage.goto();
    await studentCoursesPage.enroll(course.eng201);

    await studentEnrollmentsPage.goto();
    await studentEnrollmentsPage.expectEnrolled(course.eng201);

    await studentEnrollmentsPage.drop(course.eng201);
    await studentEnrollmentsPage.expectNotEnrolled(course.eng201);
  });
});

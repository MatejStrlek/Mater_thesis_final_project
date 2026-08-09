import { test, expect } from '../../fixtures';

test.describe('Student course enrollment', () => {
  test('can enroll in an available course', async ({ studentCoursesPage, studentEnrollmentsPage }) => {
    await studentCoursesPage.goto();
    await studentCoursesPage.enroll('PHY201');

    await studentEnrollmentsPage.goto();
    await studentEnrollmentsPage.expectEnrolled('PHY201');

    // leave the world as found, so this test is safe to re-run
    await studentEnrollmentsPage.drop('PHY201');
  });

  test('can drop an enrolled course', async ({ studentCoursesPage, studentEnrollmentsPage }) => {
    await studentCoursesPage.goto();
    await studentCoursesPage.enroll('ENG201');

    await studentEnrollmentsPage.goto();
    await studentEnrollmentsPage.expectEnrolled('ENG201');

    await studentEnrollmentsPage.drop('ENG201');
    await studentEnrollmentsPage.expectNotEnrolled('ENG201');
  });
});
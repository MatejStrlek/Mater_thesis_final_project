import { test, expect } from '../../fixtures';

test.describe('Admin course management', () => {
  // Course codes created by the current test, deleted in afterEach so a
  // leftover course never breaks the next run (course codes are unique).
  // Safe under fullyParallel: each worker is a separate process, and a
  // single worker only ever runs one test (and its own afterEach) at a
  // time, so this never crosses between two tests.
  const createdCourseCodes: string[] = [];

  test.beforeEach(async ({ adminCoursesPage }) => {
    await adminCoursesPage.goto();
  });

  test.afterEach(async ({ adminCoursesPage }) => {
    for (const code of createdCourseCodes.splice(0)) {
      await adminCoursesPage.goto();
      await adminCoursesPage.deleteCourse(code);
    }
  });

  test('lists seeded courses', async ({ adminCoursesPage }) => {
    await adminCoursesPage.expectCourseVisible('CS101');
  });

  test('creates a new course', async ({ adminCoursesPage }) => {
    await adminCoursesPage.createCourse({
      courseCode: 'TEST101',
      courseName: 'New Verification Course',
      credits: 3,
    });
    createdCourseCodes.push('TEST101');
    await adminCoursesPage.expectCourseVisible('TEST101');
  });

  test('edits an existing course', async ({ adminCoursesPage }) => {
    await adminCoursesPage.createCourse({
      courseCode: 'TEST102',
      courseName: 'Editable Course',
      credits: 3,
    });
    createdCourseCodes.push('TEST102');
    await adminCoursesPage.goto();
    await adminCoursesPage.editCourse('TEST102', { courseName: 'Renamed Course' });
    await expect(adminCoursesPage.courseRow('TEST102')).toContainText('Renamed Course');
  });

  test('deletes a course', async ({ adminCoursesPage }) => {
    await adminCoursesPage.createCourse({
      courseCode: 'TEST103',
      courseName: 'Deletable Course',
      credits: 3,
    });
    await adminCoursesPage.goto();
    await adminCoursesPage.deleteCourse('TEST103');
    await adminCoursesPage.expectCourseHidden('TEST103');
  });
});
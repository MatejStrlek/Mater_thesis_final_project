import { test, expect } from '../../fixtures';
import { courseId } from '../../utils/test-data';

test.describe('Admin course content management', () => {
  // Content titles created by the current test, deleted in afterEach —
  // same cleanup pattern as admin/courses.spec.ts's createdCourseCodes.
  const createdTitles: string[] = [];

  test.afterEach(async ({ adminCourseContentPage }) => {
    for (const title of createdTitles.splice(0)) {
      await adminCourseContentPage.deleteContent(courseId.cs101, title);
    }
  });

  test('creates a new content item', async ({ adminCourseContentPage }) => {
    await test.step('Fill out and submit the new-content form', async () => {
      await adminCourseContentPage.createContent(courseId.cs101, {
        title: 'E2E Admin Content 1',
        contentType: 'LECTURE',
        description: 'Created by the admin content CRUD spec',
      });
      createdTitles.push('E2E Admin Content 1');
    });

    await test.step('Verify it appears in the content list', async () => {
      await adminCourseContentPage.goto(courseId.cs101);
      await adminCourseContentPage.expectContentVisible('E2E Admin Content 1');
    });
  });

  test('edits an existing content item', async ({ adminCourseContentPage }) => {
    await test.step('Create a content item to edit', async () => {
      await adminCourseContentPage.createContent(courseId.cs101, {
        title: 'E2E Admin Content 2',
        contentType: 'ASSIGNMENT',
      });
      createdTitles.push('E2E Admin Content 2');
    });

    await test.step('Edit its title', async () => {
      await adminCourseContentPage.editContent(courseId.cs101, 'E2E Admin Content 2', {
        title: 'E2E Admin Content 2 Renamed',
      });
      createdTitles[createdTitles.indexOf('E2E Admin Content 2')] = 'E2E Admin Content 2 Renamed';
    });

    await test.step('Verify the new title is reflected in the list', async () => {
      await adminCourseContentPage.goto(courseId.cs101);
      await adminCourseContentPage.expectContentVisible('E2E Admin Content 2 Renamed');
    });
  });

  test('deletes a content item', async ({ adminCourseContentPage }) => {
    await adminCourseContentPage.createContent(courseId.cs101, {
      title: 'E2E Admin Content 3',
      contentType: 'QUIZ',
    });
    await adminCourseContentPage.deleteContent(courseId.cs101, 'E2E Admin Content 3');
    await adminCourseContentPage.goto(courseId.cs101);
    await adminCourseContentPage.expectContentHidden('E2E Admin Content 3');
  });

  test('toggles publish status on a content item', async ({ adminCourseContentPage }) => {
    await adminCourseContentPage.createContent(courseId.cs101, {
      title: 'E2E Admin Content 4',
      contentType: 'ANNOUNCEMENT',
    });
    createdTitles.push('E2E Admin Content 4');

    await adminCourseContentPage.goto(courseId.cs101);
    const row = adminCourseContentPage.contentRow('E2E Admin Content 4');
    await expect(row).toContainText('Draft');

    await adminCourseContentPage.togglePublish(courseId.cs101, 'E2E Admin Content 4');
    await expect(adminCourseContentPage.contentRow('E2E Admin Content 4')).toContainText('Published');
  });
});

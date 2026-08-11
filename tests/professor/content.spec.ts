import { test, expect } from '../../fixtures';
import { courseId } from '../../utils/test-data';

test.describe('Professor course content management', () => {
  // CS101 is owned by mkrmpotic (primaryUsers.professor), the professor
  // project's logged-in user — see utils/test-data.ts.
  const createdTitles: string[] = [];

  test.afterEach(async ({ professorCourseContentPage }) => {
    for (const title of createdTitles.splice(0)) {
      await professorCourseContentPage.deleteContent(courseId.cs101, title);
    }
  });

  test('creates a new content item', async ({ professorCourseContentPage }) => {
    await test.step('Fill out and submit the new-content form', async () => {
      await professorCourseContentPage.createContent(courseId.cs101, {
        title: 'E2E Professor Content 1',
        contentType: 'LECTURE',
        description: 'Created by the professor content CRUD spec',
      });
      createdTitles.push('E2E Professor Content 1');
    });

    await test.step('Verify it appears in the content list', async () => {
      await professorCourseContentPage.goto(courseId.cs101);
      await professorCourseContentPage.expectContentVisible('E2E Professor Content 1');
    });
  });

  test('edits an existing content item', async ({ professorCourseContentPage }) => {
    await test.step('Create a content item to edit', async () => {
      await professorCourseContentPage.createContent(courseId.cs101, {
        title: 'E2E Professor Content 2',
        contentType: 'ASSIGNMENT',
      });
      createdTitles.push('E2E Professor Content 2');
    });

    await test.step('Edit its title', async () => {
      await professorCourseContentPage.editContent(courseId.cs101, 'E2E Professor Content 2', {
        title: 'E2E Professor Content 2 Renamed',
      });
      createdTitles[createdTitles.indexOf('E2E Professor Content 2')] = 'E2E Professor Content 2 Renamed';
    });

    await test.step('Verify the new title is reflected in the list', async () => {
      await professorCourseContentPage.goto(courseId.cs101);
      await professorCourseContentPage.expectContentVisible('E2E Professor Content 2 Renamed');
    });
  });

  test('deletes a content item via the confirm modal', async ({ professorCourseContentPage }) => {
    await professorCourseContentPage.createContent(courseId.cs101, {
      title: 'E2E Professor Content 3',
      contentType: 'QUIZ',
    });
    await professorCourseContentPage.deleteContent(courseId.cs101, 'E2E Professor Content 3');
    await professorCourseContentPage.goto(courseId.cs101);
    await professorCourseContentPage.expectContentHidden('E2E Professor Content 3');
  });

  test('toggles publish status on a content item', async ({ professorCourseContentPage }) => {
    await professorCourseContentPage.createContent(courseId.cs101, {
      title: 'E2E Professor Content 4',
      contentType: 'ANNOUNCEMENT',
    });
    createdTitles.push('E2E Professor Content 4');

    await professorCourseContentPage.goto(courseId.cs101);
    await expect(professorCourseContentPage.contentRow('E2E Professor Content 4')).toContainText('Draft');

    await professorCourseContentPage.togglePublish(courseId.cs101, 'E2E Professor Content 4');
    await expect(professorCourseContentPage.contentRow('E2E Professor Content 4')).toContainText('Published');
  });
});

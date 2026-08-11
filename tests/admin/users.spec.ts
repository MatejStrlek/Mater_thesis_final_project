import { test, expect } from '../../fixtures';
import { primaryUsers } from '../../utils/test-data';

test.describe('Admin user management', () => {
  // Usernames created by the current test, deleted in afterEach — same
  // cleanup pattern as admin/courses.spec.ts's createdCourseCodes.
  const createdUsernames: string[] = [];

  test.beforeEach(async ({ adminUsersPage }) => {
    await adminUsersPage.goto();
  });

  test.afterEach(async ({ adminUsersPage }) => {
    for (const username of createdUsernames.splice(0)) {
      await adminUsersPage.goto();
      await adminUsersPage.deleteUser(username);
    }
  });

  test('creates a new user', async ({ adminUsersPage }) => {
    await test.step('Fill out and submit the registration form', async () => {
      await adminUsersPage.createUser({
        username: 'e2etest1',
        firstName: 'Test',
        lastName: 'UserOne',
        email: 'e2etest1@example.com',
        role: 'STUDENT',
      });
      createdUsernames.push('e2etest1');
    });

    await test.step('Verify it appears in the user list', async () => {
      await adminUsersPage.expectUserVisible('e2etest1');
    });
  });

  test('edits an existing user', async ({ adminUsersPage }) => {
    await test.step('Create a user to edit', async () => {
      await adminUsersPage.createUser({
        username: 'e2etest2',
        firstName: 'Test',
        lastName: 'UserTwo',
        email: 'e2etest2@example.com',
        role: 'STUDENT',
      });
      createdUsernames.push('e2etest2');
    });

    await test.step('Edit their last name', async () => {
      await adminUsersPage.goto();
      await adminUsersPage.editUser('e2etest2', { lastName: 'Renamed' });
    });

    await test.step('Verify the new name is reflected in the list', async () => {
      await adminUsersPage.goto();
      await expect(adminUsersPage.userRow('e2etest2')).toContainText('Renamed');
    });
  });

  test('deletes a user', async ({ adminUsersPage }) => {
    await adminUsersPage.createUser({
      username: 'e2etest3',
      firstName: 'Test',
      lastName: 'UserThree',
      email: 'e2etest3@example.com',
      role: 'STUDENT',
    });
    await adminUsersPage.goto();
    await adminUsersPage.deleteUser('e2etest3');
    await adminUsersPage.expectUserHidden('e2etest3');
  });

  test('filters the user list by role', async ({ adminUsersPage }) => {
    await test.step('Filter to professors only', async () => {
      await adminUsersPage.filterByRole('PROFESSOR');
      await adminUsersPage.expectUserVisible(primaryUsers.professor.username);
      await adminUsersPage.expectUserHidden(primaryUsers.student.username);
    });

    await test.step('Filter to students only', async () => {
      await adminUsersPage.filterByRole('STUDENT');
      await adminUsersPage.expectUserVisible(primaryUsers.student.username);
      await adminUsersPage.expectUserHidden(primaryUsers.professor.username);
    });
  });
});

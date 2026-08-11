import { test, expect } from '../../fixtures';
import { courseId } from '../../utils/test-data';

test.describe('Admin schedule management', () => {
  // Entries are keyed by room in this suite (see AdminSchedulePage.scheduleRow),
  // so rooms created by the current test are tracked here and cleaned up in
  // afterEach — same pattern admin/courses.spec.ts uses for course codes.
  const createdRooms: string[] = [];

  test.beforeEach(async ({ adminSchedulePage }) => {
    await adminSchedulePage.goto();
  });

  test.afterEach(async ({ adminSchedulePage }) => {
    for (const room of createdRooms.splice(0)) {
      await adminSchedulePage.goto();
      await adminSchedulePage.deleteEntry(room);
    }
  });

  test('creates a new schedule entry', async ({ adminSchedulePage }) => {
    await test.step('Fill out and submit the new-entry form', async () => {
      await adminSchedulePage.createEntry({
        courseId: courseId.cs101,
        dayOfWeek: 'MONDAY',
        startTime: '09:00',
        endTime: '10:00',
        room: 'E2E-ROOM-101',
      });
      createdRooms.push('E2E-ROOM-101');
    });

    await test.step('Verify it appears in the schedule list', async () => {
      await adminSchedulePage.expectEntryVisible('E2E-ROOM-101');
    });
  });

  test('edits an existing schedule entry', async ({ adminSchedulePage }) => {
    await test.step('Create an entry to edit', async () => {
      await adminSchedulePage.createEntry({
        courseId: courseId.cs101,
        dayOfWeek: 'TUESDAY',
        startTime: '11:00',
        endTime: '12:00',
        room: 'E2E-ROOM-102',
      });
      createdRooms.push('E2E-ROOM-102');
    });

    await test.step('Edit its room', async () => {
      await adminSchedulePage.goto();
      await adminSchedulePage.editEntry('E2E-ROOM-102', { room: 'E2E-ROOM-102-RENAMED' });
      createdRooms[createdRooms.indexOf('E2E-ROOM-102')] = 'E2E-ROOM-102-RENAMED';
    });

    await test.step('Verify the new room is reflected in the list', async () => {
      await adminSchedulePage.expectEntryVisible('E2E-ROOM-102-RENAMED');
    });
  });

  test('deletes a schedule entry', async ({ adminSchedulePage }) => {
    await adminSchedulePage.createEntry({
      courseId: courseId.cs101,
      dayOfWeek: 'WEDNESDAY',
      startTime: '13:00',
      endTime: '14:00',
      room: 'E2E-ROOM-103',
    });
    await adminSchedulePage.goto();
    await adminSchedulePage.deleteEntry('E2E-ROOM-103');
    await adminSchedulePage.expectEntryHidden('E2E-ROOM-103');
  });
});

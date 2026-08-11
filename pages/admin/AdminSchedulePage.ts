import { expect, type Locator } from '@playwright/test';
import { BasePage } from '../BasePage';

export interface ScheduleFormData {
  courseId: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room?: string;
}

/** /admin/schedule — list, create, edit, delete. */
export class AdminSchedulePage extends BasePage {
  async goto() {
    await this.page.goto('/admin/schedule');
  }

  async gotoCreate() {
    await this.page.getByTestId('create-schedule-button').click();
  }

  /**
   * Rows are keyed by the entry's numeric id (unknown until creation, like
   * AdminCoursesPage's course-code rows) — matched by room text instead,
   * which callers pick to be unique per test.
   */
  scheduleRow(room: string): Locator {
    return this.row(room);
  }

  private async fillForm(data: Partial<ScheduleFormData>) {
    if (data.courseId !== undefined) {
      await this.page.getByLabel('Course').selectOption(String(data.courseId));
    }
    if (data.dayOfWeek) await this.page.getByLabel('Day of Week').selectOption(data.dayOfWeek);
    if (data.startTime) await this.page.getByLabel('Start Time').fill(data.startTime);
    if (data.endTime) await this.page.getByLabel('End Time').fill(data.endTime);
    if (data.room) await this.page.getByLabel('Room').fill(data.room);
  }

  async createEntry(data: ScheduleFormData) {
    await this.gotoCreate();
    await this.fillForm(data);
    await this.page.getByTestId('schedule-form-submit').click();
  }

  async editEntry(room: string, data: Partial<ScheduleFormData>) {
    await this.scheduleRow(room).locator('[data-testid^="edit-schedule-"]').click();
    await this.fillForm(data);
    await this.page.getByTestId('schedule-form-submit').click();
  }

  async deleteEntry(room: string) {
    this.page.once('dialog', (dialog) => dialog.accept());
    await this.scheduleRow(room).locator('[data-testid^="delete-schedule-"]').click();
  }

  async expectEntryVisible(room: string) {
    await expect(this.scheduleRow(room)).toBeVisible();
  }

  async expectEntryHidden(room: string) {
    await expect(this.scheduleRow(room)).toHaveCount(0);
  }
}

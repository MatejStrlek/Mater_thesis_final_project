import { expect, type Locator } from '@playwright/test';
import { BasePage } from '../BasePage';

export type ContentType = 'LECTURE' | 'ASSIGNMENT' | 'QUIZ' | 'READING_MATERIAL' | 'ANNOUNCEMENT' | 'OTHER';

export interface ContentFormData {
  title: string;
  contentType: ContentType;
  description?: string;
  content?: string;
}

/** /admin/courses/{courseId}/content — list, create, edit, delete, publish toggle. */
export class AdminCourseContentPage extends BasePage {
  async goto(courseId: number) {
    await this.page.goto(`/admin/courses/${courseId}/content`);
  }

  async gotoCreate() {
    await this.page.getByTestId('create-content-button').click();
  }

  /**
   * Rows are keyed by the content's numeric id (unknown until creation) —
   * matched by title text instead, same pattern as other list pages in
   * this suite (e.g. AdminCoursesPage keying rows off course code).
   */
  contentRow(title: string): Locator {
    return this.row(title);
  }

  private async fillForm(data: Partial<ContentFormData>) {
    if (data.title) await this.page.getByLabel('Title').fill(data.title);
    if (data.contentType) {
      await this.page.getByLabel('Content Type', { exact: true }).selectOption(data.contentType);
    }
    if (data.description) await this.page.getByLabel('Short Description').fill(data.description);
    if (data.content) await this.page.getByLabel('Content', { exact: true }).fill(data.content);
  }

  async createContent(courseId: number, data: ContentFormData) {
    await this.goto(courseId);
    await this.gotoCreate();
    await this.fillForm(data);
    await this.page.getByTestId('content-form-submit').click();
  }

  async editContent(courseId: number, title: string, data: Partial<ContentFormData>) {
    await this.goto(courseId);
    await this.contentRow(title).locator('[data-testid^="edit-content-"]').click();
    await this.fillForm(data);
    await this.page.getByTestId('content-form-submit').click();
  }

  async deleteContent(courseId: number, title: string) {
    await this.goto(courseId);
    this.page.once('dialog', (dialog) => dialog.accept());
    await this.contentRow(title).locator('[data-testid^="delete-content-"]').click();
  }

  async togglePublish(courseId: number, title: string) {
    await this.goto(courseId);
    await this.contentRow(title).locator('[data-testid^="toggle-publish-content-"]').click();
  }

  async expectContentVisible(title: string) {
    await expect(this.contentRow(title)).toBeVisible();
  }

  async expectContentHidden(title: string) {
    await expect(this.contentRow(title)).toHaveCount(0);
  }
}

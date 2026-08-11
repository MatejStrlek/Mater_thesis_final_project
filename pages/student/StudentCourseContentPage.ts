import { expect, type Locator } from '@playwright/test';
import { BasePage } from '../BasePage';

/**
 * /student/courses/{courseId}/content — published content list, plus the
 * single-item view page (StudentCourseContentController only ever shows
 * published content to students; unpublished items simply don't appear).
 */
export class StudentCourseContentPage extends BasePage {
  async goto(courseId: number) {
    await this.page.goto(`/student/courses/${courseId}/content`);
  }

  /** Rows are keyed by the content's numeric id (unknown to callers) —
   * matched by title text instead, same pattern as the admin/professor
   * content Page Objects. */
  contentRow(title: string): Locator {
    return this.row(title);
  }

  async viewContent(title: string) {
    await this.contentRow(title).locator('[data-testid^="view-content-"]').click();
  }

  async expectContentVisible(title: string) {
    await expect(this.contentRow(title)).toBeVisible();
  }

  async expectContentHidden(title: string) {
    await expect(this.contentRow(title)).toHaveCount(0);
  }
}

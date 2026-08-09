import type { Locator, Page } from '@playwright/test';

/**
 * Shared behavior every authenticated page has (the navbar's logout
 * button) plus a generic role-scoped row locator most list pages in this
 * app key off of. Page Objects extend this instead of duplicating it.
 */
export class BasePage {
  constructor(protected readonly page: Page) {}

  async logout() {
    await this.page.getByRole('button', { name: 'Logout' }).click();
  }

  protected row(text: string): Locator {
    return this.page.getByRole('row', { name: text });
  }
}

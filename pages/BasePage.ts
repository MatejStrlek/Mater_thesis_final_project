import type { Locator, Page } from '@playwright/test';

/**
 * Shared behavior every authenticated page has (the navbar's logout
 * button) plus a generic role-scoped row locator most list pages in this
 * app key off of. Page Objects extend this instead of duplicating it.
 */
export class BasePage {
  constructor(protected readonly page: Page) {}

  /**
   * `logout-button`'s visible text (nav.logout) is i18n-driven like every
   * other nav label — `data-testid` sidesteps that instead of assuming the
   * shared session is still on English, which the localization race in
   * tests/shared/localization.spec.ts proved isn't a safe assumption.
   */
  async logout() {
    await this.page.getByTestId('logout-button').click();
  }

  /**
   * The language dropdown's own toggle button has no stable accessible
   * name — its visible text is "EN"/"HR"/"DE" depending on the *current*
   * locale, which is exactly what this method changes — so `data-testid`
   * (added to the app's navbar for this) is used instead of role+name here.
   */
  async switchLanguage(language: 'en' | 'hr' | 'de') {
    await this.page.getByTestId('language-dropdown-toggle').click();
    await this.page.getByTestId(`language-option-${language}`).click();
  }

  protected row(text: string): Locator {
    return this.page.getByRole('row', { name: text });
  }
}

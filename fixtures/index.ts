import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

/**
 * Merges every Page Object into one custom `test`, so specs and
 * tests/auth.setup.ts request them by name instead of constructing
 * `new SomePage(page)` inline. Grows as more Page Objects are added.
 */
type Fixtures = {
  loginPage: LoginPage;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});

export { expect } from '@playwright/test';

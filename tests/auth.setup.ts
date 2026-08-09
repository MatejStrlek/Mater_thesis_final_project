import { test as setup } from '../fixtures';
import { primaryUsers } from '../utils/test-data';

/**
 * Logs in as each seeded role once and saves the resulting session as
 * storageState, so the admin/professor/student projects (playwright.config.ts)
 * never re-do the login UI flow just to reach an authenticated page
 * (final project spec, Outcome 4 min).
 */
for (const [role, { username, password }] of Object.entries(primaryUsers)) {
  setup(`authenticate as ${role}`, async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.login(username, password);
    await loginPage.expectLoggedIn();
    await page.context().storageState({ path: `playwright/.auth/${role}.json` });
  });
}

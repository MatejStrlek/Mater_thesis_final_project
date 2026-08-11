import { expect, type Locator } from '@playwright/test';
import { BasePage } from '../BasePage';

export interface UserFormData {
  username: string;
  password?: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'STUDENT' | 'PROFESSOR' | 'ADMIN';
}

/** /admin/users — list (with role filter), create, edit, delete. */
export class AdminUsersPage extends BasePage {
  async goto() {
    await this.page.goto('/admin/users');
  }

  async filterByRole(role: 'STUDENT' | 'PROFESSOR' | 'ADMIN' | '') {
    await this.page.getByTestId('role-filter').selectOption(role);
  }

  async gotoCreate() {
    await this.page.getByTestId('create-user-button').click();
  }

  userRow(username: string): Locator {
    return this.row(username);
  }

  /**
   * /admin/users/register redirects to /dashboard on success (not back to
   * the list), so this navigates back to /admin/users itself once done —
   * callers don't need to know that quirk.
   */
  async createUser(data: UserFormData) {
    await this.gotoCreate();
    await this.page.getByLabel('Username').fill(data.username);
    await this.page.getByLabel('Password').fill(data.password ?? 'password');
    await this.page.getByLabel('First Name').fill(data.firstName);
    await this.page.getByLabel('Last Name').fill(data.lastName);
    await this.page.getByLabel('Email').fill(data.email);
    await this.page.getByTestId('role-select').selectOption(data.role);
    await this.page.getByTestId('user-form-submit').click();
    await this.goto();
  }

  async editUser(username: string, data: Partial<Omit<UserFormData, 'username'>>) {
    await this.userRow(username).locator('[data-testid^="edit-user-"]').click();
    if (data.firstName) await this.page.getByLabel('First Name').fill(data.firstName);
    if (data.lastName) await this.page.getByLabel('Last Name').fill(data.lastName);
    if (data.email) await this.page.getByLabel('Email').fill(data.email);
    if (data.role) await this.page.getByLabel('Role').selectOption(data.role);
    await this.page.getByTestId('user-form-submit').click();
  }

  async deleteUser(username: string) {
    this.page.once('dialog', (dialog) => dialog.accept());
    await this.userRow(username).locator('[data-testid^="delete-user-"]').click();
  }

  async expectUserVisible(username: string) {
    await expect(this.userRow(username)).toBeVisible();
  }

  async expectUserHidden(username: string) {
    await expect(this.userRow(username)).toHaveCount(0);
  }
}

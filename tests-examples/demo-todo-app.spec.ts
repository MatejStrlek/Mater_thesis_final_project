import { test, expect, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('https://demo.playwright.dev/todomvc');
});

const TODO_ITEMS = [
  'buy some cheese',
  'feed the cat',
  'book a doctors appointment',
] as const;

test.describe('New Todo', () => {
  test('should allow me to add todo items', async ({ page }) => {
    const newTodo = page.getByPlaceholder('What needs to be done?');
    await newTodo.fill(TODO_ITEMS[0]);
    await newTodo.press('Enter');

    await expect(page.getByTestId('todo-title')).toHaveText([TODO_ITEMS[0]]);

    await newTodo.fill(TODO_ITEMS[1]);
    await newTodo.press('Enter');

    await expect(page.getByTestId('todo-title')).toHaveText([
      TODO_ITEMS[0],
      TODO_ITEMS[1],
    ]);

    await checkNumberOfTodosInLocalStorage(page, 2);
  });
});

async function checkNumberOfTodosInLocalStorage(page: Page, expected: number) {
  return await page.waitForFunction((e) => {
    return JSON.parse(localStorage['react-todos']).length === e;
  }, expected);
}

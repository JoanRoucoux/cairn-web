import { expect, test } from '@playwright/test';

import { mockApi } from './fixtures/api';
import { AccountsPageObject } from './pages/accounts-page';

test.describe('accounts', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  test('shows each account with its envelope, institution, value and line count', async ({ page }) => {
    const accounts = new AccountsPageObject(page);
    await accounts.goto();

    const row = accounts.rowFor('Northwind PEA');
    await expect(row).toContainText('PEA');
    await expect(row).toContainText('Northwind Bank');
    await expect(row).toContainText('holdings');
  });

  test('values an account by its priced lines and names the lines it leaves out, linking to the account', async ({
    page,
  }) => {
    const accounts = new AccountsPageObject(page);
    await accounts.goto();

    const row = accounts.rowFor('Northwind PEA');
    await expect(row).not.toContainText('—');
    const caption = row.getByTestId('account-uncounted');
    await expect(caption).toContainText('1 line with no quote, not counted');
    await expect(caption).toContainText('1 line outside the euro, not counted');
    await expect(caption).toHaveAttribute('href', /\/holdings\?compte=/);
    await expect(page.getByTestId('accounts-summary-excluded')).toHaveText(/excluding 2 lines/);
    await expect(page.getByTestId('accounts-summary-excluded-mobile')).toBeHidden();
  });

  test('says what the total leaves out on its own line on iPhone, and names the lines in the row', async ({
    browser,
  }) => {
    const context = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await mockApi(page);
    await page.goto('/accounts');

    await expect(page.getByTestId('accounts-summary-excluded-mobile')).toHaveText('Excluding 2 lines');
    await expect(page.getByTestId('accounts-summary-excluded')).toBeHidden();
    const row = page.getByTestId('account-row-mobile').filter({ hasText: 'Northwind PEA' });
    await expect(row.getByTestId('account-uncounted-mobile')).toHaveText([
      '1 line with no quote, not counted',
      '1 line outside the euro, not counted',
    ]);

    await context.close();
  });

  test('shows the balance date of a savings account instead of a line count, and no empty panel', async ({ page }) => {
    const accounts = new AccountsPageObject(page);
    await accounts.goto();

    const row = accounts.rowFor('Livret A');
    await expect(row.getByTestId('account-lines')).toContainText(/Balance as of \d\d\/\d\d/);
    await expect(row).not.toContainText('holding');
    await expect(row).toContainText('20,000');
    await expect(page.getByTestId('account-empty-hint')).toHaveCount(0);
  });

  test('shows the empty panel for a securities account with no line and no cash, never for savings', async ({
    page,
  }) => {
    const accounts = new AccountsPageObject(page);
    await accounts.goto();

    await accounts.addButton.click();
    await page.getByTestId('account-form-name').fill('Wise EUR');
    await page.getByTestId('account-form-type').getByRole('radio', { name: 'CTO', exact: true }).click();
    await page.getByTestId('account-form-submit').click();

    await expect(accounts.rowFor('Wise EUR')).toBeVisible();
    await expect(page.getByTestId('account-empty-hint')).toHaveCount(1);
    await expect(page.getByTestId('account-empty-hint')).toContainText('no holdings yet');
  });

  test('sends the empty account to the add-a-line flow with itself preselected', async ({ page }) => {
    const accounts = new AccountsPageObject(page);
    await accounts.goto();

    await accounts.addButton.click();
    await page.getByTestId('account-form-name').fill('Wise EUR');
    await page.getByTestId('account-form-type').getByRole('radio', { name: 'CTO', exact: true }).click();
    await page.getByTestId('account-form-submit').click();
    await expect(accounts.rowFor('Wise EUR')).toBeVisible();

    const link = page.getByTestId('account-empty-add');
    const href = await link.getAttribute('href');
    expect(href).toMatch(/^\/holdings\?add=/);
    const accountId = new URLSearchParams(href!.split('?')[1]).get('add')!;
    await link.click();

    await expect(page).toHaveURL(/\/holdings$/);
    await expect(page.getByTestId('holding-add-dialog').locator('dialog')).toBeVisible();
    await expect(page.getByTestId('holding-add-account')).toHaveValue(accountId);
  });

  test('offers the balance edit first in the menu of a savings account only, and opens its dialog in Lignes', async ({
    page,
  }) => {
    const accounts = new AccountsPageObject(page);
    await accounts.goto();

    await accounts.openMenuFor('Northwind PEA');
    await expect(page.getByRole('menuitem', { name: 'Edit the balance' })).toHaveCount(0);
    await page.keyboard.press('Escape');

    await accounts.openMenuFor('Livret A');
    await expect(page.getByRole('menuitem').first()).toHaveText('Edit the balance');
    await page.getByTestId('account-edit-balance').click();

    await expect(page).toHaveURL(/\/holdings$/);
    await expect(page.getByTestId('holding-cash-dialog').locator('dialog')).toBeVisible();
    await expect(page.getByRole('dialog')).toContainText('Balance of Livret A');
    await expect(page.getByTestId('holding-cash-amount')).toHaveValue('20000');

    await page.getByTestId('holding-cash-amount').fill('0');
    await expect(page.getByText('0 removes the line.')).toHaveCount(0);
    await page.getByTestId('holding-cash-submit').click();

    await expect(page.locator('ui-toaster > div')).toHaveText('Balance updated');
    const livretA = page.getByTestId('account-group').filter({ hasText: 'Livret A' });
    await expect(livretA.getByTestId('cash-row')).toContainText('0.00');
    await expect(livretA.getByTestId('cash-row')).toContainText('Entered on');
  });

  test('keeps a savings account out of the add-a-line account picker', async ({ page }) => {
    await page.goto('/holdings');

    await page.getByTestId('add-holding-desktop').click();

    await expect(page.getByTestId('holding-add-account').locator('option', { hasText: 'Livret A' })).toHaveCount(0);
    await expect(page.getByTestId('holding-add-account').locator('option', { hasText: 'Northwind PEA' })).toHaveCount(
      1,
    );
  });

  test('lands on the lines of the account with its group heading focused', async ({ page }) => {
    const accounts = new AccountsPageObject(page);
    await accounts.goto();

    const link = accounts.rowFor('Northwind PEA').getByTestId('account-link');
    await expect(link).toHaveAttribute('href', /\/holdings\?compte=.+/);
    await link.click();

    await expect(page).toHaveURL(/\/holdings\?compte=/);
    await expect(page.locator('h2[data-group-heading]:focus')).toBeVisible();
    await expect(page.locator('h2[data-group-heading]:focus')).toContainText('Northwind PEA');
  });

  test('summarises the accounts with their count and total above the table', async ({ page }) => {
    const accounts = new AccountsPageObject(page);
    await accounts.goto();

    await expect(page.getByTestId('accounts-summary')).toContainText(/\d+ accounts/);
    await expect(page.getByRole('columnheader', { name: 'Share' })).toBeVisible();
  });

  test('names the envelopes instead of showing their contract codes', async ({ page }) => {
    const accounts = new AccountsPageObject(page);
    await accounts.goto();

    await accounts.addButton.click();
    await expect(page.getByTestId('account-form-type').getByRole('radio', { name: 'Life insurance' })).toBeVisible();
  });

  test('preselects PEA and enables the submit once a name is typed', async ({ page }) => {
    const accounts = new AccountsPageObject(page);
    await accounts.goto();

    await accounts.addButton.click();
    await expect(page.getByTestId('account-form-type').getByRole('radio', { name: 'PEA', exact: true })).toBeChecked();
    await expect(page.getByTestId('account-form-submit')).toBeDisabled();
    await page.getByTestId('account-form-name').fill('Test');

    await expect(page.getByTestId('account-form-submit')).toBeEnabled();
  });

  test('creates an account and sees it in the list', async ({ page }) => {
    const accounts = new AccountsPageObject(page);
    await accounts.goto();

    await accounts.addButton.click();
    await page.getByTestId('account-form-name').fill('Wise EUR');
    await page.getByTestId('account-form-type').getByRole('radio', { name: 'CTO', exact: true }).click();
    await page.getByTestId('account-form-institution').fill('Contoso Securities');
    await page.getByTestId('account-form-submit').click();

    await expect(page.getByTestId('account-form-dialog').locator('dialog')).toBeHidden();
    await expect(accounts.rowFor('Wise EUR')).toBeVisible();
  });

  test('renames an account and sees the change in the list', async ({ page }) => {
    const accounts = new AccountsPageObject(page);
    await accounts.goto();

    await accounts.openMenuFor('Livret A');
    await accounts.editButtonFor('Livret A').click();
    await page.getByTestId('account-form-name').fill('Livret A (Woodgrove)');
    await page.getByTestId('account-form-submit').click();

    await expect(page.getByTestId('account-form-dialog').locator('dialog')).toBeHidden();
    await expect(accounts.rowFor('Livret A (Woodgrove)')).toBeVisible();
  });

  test('shows a field error on the name, not a generic failure, when it is already taken', async ({ page }) => {
    const accounts = new AccountsPageObject(page);
    await accounts.goto();

    await accounts.openMenuFor('Livret A');
    await accounts.editButtonFor('Livret A').click();
    await page.getByTestId('account-form-name').fill('Northwind PEA');
    await page.getByTestId('account-form-submit').click();

    await expect(page.getByText('already has this name')).toBeVisible();
    await expect(page.getByTestId('account-form-dialog').locator('dialog')).toBeVisible();
    await expect(page.getByTestId('account-form-error')).toHaveCount(0);
  });

  test('deletes an empty account and sees it gone from the list', async ({ page }) => {
    const accounts = new AccountsPageObject(page);
    await accounts.goto();

    await accounts.addButton.click();
    await page.getByTestId('account-form-name').fill('Wise EUR');
    await page.getByTestId('account-form-type').getByRole('radio', { name: 'CTO', exact: true }).click();
    await page.getByTestId('account-form-institution').fill('Contoso Securities');
    await page.getByTestId('account-form-submit').click();
    await expect(accounts.rowFor('Wise EUR')).toBeVisible();

    await accounts.openMenuFor('Wise EUR');
    await accounts.deleteButtonFor('Wise EUR').click();
    await page.getByTestId('account-delete-confirm').click();

    await expect(page.getByTestId('account-delete-dialog').locator('dialog')).toBeHidden();
    await expect(accounts.rowFor('Wise EUR')).toHaveCount(0);
  });

  test('refuses to delete an account that still holds lines, keeps the dialog open and the account listed', async ({
    page,
  }) => {
    const accounts = new AccountsPageObject(page);
    await accounts.goto();

    await accounts.openMenuFor('Northwind PEA');
    await accounts.deleteButtonFor('Northwind PEA').click();
    await page.getByTestId('account-delete-confirm').click();

    await expect(page.getByTestId('account-delete-refused')).toBeVisible();
    await expect(page.getByTestId('account-delete-dialog').locator('dialog')).toBeVisible();

    await page.getByTestId('account-delete-cancel').click();
    await expect(accounts.rowFor('Northwind PEA')).toBeVisible();
  });
});

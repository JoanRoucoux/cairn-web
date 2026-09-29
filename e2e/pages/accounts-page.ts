import { type Locator, type Page } from '@playwright/test';

export class AccountsPageObject {
  readonly rows: Locator;
  readonly addButton: Locator;

  constructor(private readonly page: Page) {
    this.rows = page.getByTestId('account-row');
    this.addButton = page.getByTestId('account-add');
  }

  async goto(): Promise<void> {
    await this.page.goto('/accounts');
  }

  rowFor(name: string): Locator {
    return this.rows.filter({ hasText: name });
  }

  async openMenuFor(name: string): Promise<void> {
    await this.rowFor(name).getByTestId('account-menu-trigger').click();
  }

  editButtonFor(name: string): Locator {
    return this.rowFor(name).getByTestId('account-edit');
  }

  deleteButtonFor(name: string): Locator {
    return this.rowFor(name).getByTestId('account-delete');
  }
}

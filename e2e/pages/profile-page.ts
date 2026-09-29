import { type Locator, type Page } from '@playwright/test';

export class ProfilePageObject {
  readonly hideAmounts: Locator;
  readonly signOut: Locator;
  readonly managePasskeys: Locator;

  constructor(private readonly page: Page) {
    this.hideAmounts = page.getByTestId('hide-amounts');
    this.signOut = page.getByTestId('sign-out');
    this.managePasskeys = page.getByTestId('manage-passkeys');
  }

  async goto(): Promise<void> {
    await this.page.goto('/profile');
  }
}

import { type Locator, type Page } from '@playwright/test';

export class ProfilePageObject {
  readonly hideAmounts: Locator;
  readonly signOut: Locator;
  readonly managePasskeys: Locator;
  readonly revokeButtons: Locator;
  readonly deleteDialog: Locator;
  readonly deleteCancel: Locator;
  readonly deleteConfirm: Locator;

  constructor(private readonly page: Page) {
    this.hideAmounts = page.getByTestId('hide-amounts');
    this.signOut = page.getByTestId('sign-out');
    this.managePasskeys = page.getByTestId('manage-passkeys');
    this.revokeButtons = page.getByTestId('revoke-passkey');
    this.deleteDialog = page.getByTestId('profile-passkey-delete-dialog');
    this.deleteCancel = page.getByTestId('passkey-delete-cancel');
    this.deleteConfirm = page.getByTestId('passkey-delete-confirm');
  }

  async goto(): Promise<void> {
    await this.page.goto('/profile');
  }
}

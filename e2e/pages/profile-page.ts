import { type Locator, type Page } from '@playwright/test';

export class ProfilePageObject {
  readonly signOut: Locator;
  readonly managePasskeys: Locator;
  readonly revokeButtons: Locator;
  readonly deleteDialog: Locator;
  readonly deleteCancel: Locator;
  readonly deleteConfirm: Locator;
  readonly telegramConnect: Locator;
  readonly telegramOpen: Locator;
  readonly telegramLinked: Locator;
  readonly telegramDisconnect: Locator;

  constructor(private readonly page: Page) {
    this.signOut = page.getByTestId('sign-out');
    this.managePasskeys = page.getByTestId('manage-passkeys');
    this.revokeButtons = page.getByTestId('revoke-passkey');
    this.deleteDialog = page.getByTestId('profile-passkey-delete-dialog');
    this.deleteCancel = page.getByTestId('passkey-delete-cancel');
    this.deleteConfirm = page.getByTestId('passkey-delete-confirm');
    this.telegramConnect = page.getByTestId('telegram-connect');
    this.telegramOpen = page.getByTestId('telegram-open');
    this.telegramLinked = page.getByTestId('telegram-linked');
    this.telegramDisconnect = page.getByTestId('telegram-disconnect');
  }

  async goto(): Promise<void> {
    await this.page.goto('/profile');
  }
}

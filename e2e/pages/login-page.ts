import { type Locator, type Page } from '@playwright/test';

export class LoginPageObject {
  readonly passkeyButton: Locator;
  readonly passwordToggle: Locator;
  readonly username: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly refused: Locator;

  constructor(private readonly page: Page) {
    this.passkeyButton = page.getByTestId('login-passkey');
    this.passwordToggle = page.getByTestId('login-password-toggle');
    this.username = page.getByTestId('login-username');
    this.password = page.getByTestId('login-password');
    this.submit = page.getByTestId('login-submit');
    this.refused = page.getByTestId('login-refused');
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async signInWithPassword(username: string, password: string): Promise<void> {
    await this.passwordToggle.click();
    await this.username.fill(username);
    await this.password.fill(password);
    await this.submit.click();
  }
}

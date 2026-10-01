import { expect, test } from '@playwright/test';

import { mockApi } from './fixtures/api';
import { LoginPageObject } from './pages/login-page';

test.describe('login', () => {
  let signedIn: boolean;

  test.beforeEach(async ({ page }) => {
    signedIn = false;
    await mockApi(page);
    await page.route('**/api/session', (route) =>
      signedIn ? route.fallback() : route.fulfill({ status: 401, json: { message: 'unauthenticated' } }),
    );
  });

  test('replaces the passkey block with the password form on demand, and back', async ({ page }) => {
    const login = new LoginPageObject(page);
    await login.goto();

    await expect(login.username).not.toBeVisible();

    await login.passwordToggle.click();

    await expect(login.username).toBeVisible();
    await expect(login.username).toBeFocused();
    await expect(login.passkeyButton).not.toBeVisible();

    await login.passkeyToggle.click();

    await expect(login.passkeyButton).toBeFocused();
  });

  test('shows the alert when the passkey request is cancelled, and offers to retry', async ({ page }) => {
    const login = new LoginPageObject(page);
    await login.goto();
    await page.evaluate(() => {
      navigator.credentials.get = () => Promise.reject(new DOMException('cancelled', 'NotAllowedError'));
    });

    await login.passkeyButton.click();

    await expect(login.passkeyRefused).toBeVisible();
    await expect(login.passkeyRefused).toContainText('Sign-in did not complete');
    await expect(login.passkeyButton).toContainText('Try again with a passkey');
  });

  test('shows the alert above the fields when the password is refused and keeps the username', async ({ page }) => {
    await page.route('**/api/authenticate', (route) =>
      route.fulfill({ status: 401, json: { message: 'unauthenticated' } }),
    );
    const login = new LoginPageObject(page);
    await login.goto();

    await login.signInWithPassword('joan', 'wrong-password');

    await expect(login.refused).toBeVisible();
    await expect(login.refused).toContainText('Incorrect username or password.');
    await expect(login.username).toHaveAttribute('aria-invalid', 'true');
    await expect(login.password).toHaveAttribute('aria-invalid', 'true');
    await expect(login.username).toHaveValue('joan');
    await expect(login.password).toBeFocused();
  });

  test('signs in with a password and reaches the portfolio', async ({ page }) => {
    await page.route('**/api/authenticate', (route) => {
      signedIn = true;

      return route.fulfill({ status: 204 });
    });
    const login = new LoginPageObject(page);
    await login.goto();

    await login.signInWithPassword('joan', 'a-real-password');

    await expect(page).toHaveURL('/');
  });
});

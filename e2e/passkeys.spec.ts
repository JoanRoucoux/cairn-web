import { type Page, expect, test } from '@playwright/test';

import { mockApi } from './fixtures/api';

const addVirtualAuthenticator = async (page: Page): Promise<void> => {
  const client = await page.context().newCDPSession(page);
  await client.send('WebAuthn.enable');
  await client.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
    },
  });
};

// Seeds a discoverable credential for `localhost` straight into the virtual authenticator, so an
// authentication ceremony in the same test has something to offer without the app's own register
// flow (which is exercised separately, and asks for a signed-in session).
const seedResidentCredential = (page: Page): Promise<void> =>
  page.evaluate(async () => {
    await navigator.credentials.create({
      publicKey: {
        challenge: Uint8Array.from([1, 2, 3, 4]),
        rp: { id: 'localhost', name: 'Cairn' },
        user: { id: Uint8Array.from([5, 6, 7, 8]), name: 'joan', displayName: 'Joan Roucoux' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
      },
    });
  });

// Chromium only: the virtual authenticator is a CDP capability, and Firefox/WebKit have no
// equivalent in Playwright.
test.describe('passkeys', () => {
  test.beforeEach(({ browserName }) => {
    test.skip(browserName !== 'chromium', 'virtual WebAuthn authenticator is Chromium-only');
  });

  test('registers a passkey from the account screen', async ({ page }) => {
    await addVirtualAuthenticator(page);
    await mockApi(page);

    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible();

    await page.getByTestId('manage-passkeys').click();
    await expect(page.getByTestId('profile-passkey-dialog').locator('dialog')).toBeVisible();

    let registerBody: {
      publicKey: { label: string; credential: { response: { attestationObject: string; clientDataJSON: string } } };
    } | null = null;
    await page.route('**/webauthn/register', async (route) => {
      registerBody = route.request().postDataJSON();

      return route.fallback();
    });

    await page.getByTestId('passkey-label').fill('MacBook de Joan');
    await page.getByTestId('passkey-register').click();

    await expect(page.getByTestId('profile-passkey-dialog')).toHaveCount(0);
    await expect(page.getByText('MacBook de Joan')).toBeVisible();

    expect(registerBody?.publicKey.label).toBe('MacBook de Joan');
    expect(registerBody?.publicKey.credential.response.attestationObject).toBeTruthy();
    expect(registerBody?.publicKey.credential.response.clientDataJSON).toBeTruthy();
  });

  test('signs in with a passkey from the login screen', async ({ page }) => {
    await addVirtualAuthenticator(page);
    await mockApi(page);

    // The default fixture session is a signed-in one (every other journey needs it); this test
    // overrides it to start signed out, so the login screen's guard lets it render, then flips to
    // signed in once the passkey ceremony below reports success.
    let signedIn = false;
    await page.route('**/api/session', async (route) => {
      if (!signedIn) {
        return route.fulfill({ status: 401, json: { message: 'unauthenticated' } });
      }

      return route.fallback();
    });
    let loginBody: {
      id: string;
      rawId: string;
      type: string;
      response: { authenticatorData: string; clientDataJSON: string; signature: string };
    } | null = null;
    await page.route('**/login/webauthn', async (route) => {
      signedIn = true;
      loginBody = route.request().postDataJSON();

      return route.fulfill({ json: { authenticated: true, redirectUrl: '/' } });
    });

    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in to Cairn' })).toBeVisible();

    await seedResidentCredential(page);

    await page.getByTestId('login-passkey').click();

    await expect(page).toHaveURL('/');

    expect(loginBody?.id).toBeTruthy();
    expect(loginBody?.rawId).toBe(loginBody?.id);
    expect(loginBody?.type).toBe('public-key');
    expect(loginBody?.response.authenticatorData).toBeTruthy();
    expect(loginBody?.response.clientDataJSON).toBeTruthy();
    expect(loginBody?.response.signature).toBeTruthy();
  });
});

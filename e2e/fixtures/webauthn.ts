import type { Page, Route } from '@playwright/test';

type Handler = (route: Route) => Promise<void>;

const session = {
  displayName: 'Joan Roucoux',
  initials: 'JR',
  passkeys: [
    { credentialId: 'aXBob25l', label: 'iPhone de Joan', createdAt: '2026-02-01T10:00:00Z', lastUsedAt: null },
  ],
};

// Browser-valid base64url: WebAuthn parses these into ArrayBuffers before the virtual
// authenticator ever sees them.
const base64url = (value: string): string =>
  Buffer.from(value).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+/g, '');

const authenticationOptions = {
  challenge: base64url('authenticate-challenge'),
  rpId: 'localhost',
  timeout: 60000,
  userVerification: 'required',
  allowCredentials: [],
};

const registrationOptions = {
  rp: { id: 'localhost', name: 'Cairn' },
  user: {
    id: base64url('e2e-owner'),
    name: 'joan',
    displayName: 'Joan Roucoux',
  },
  challenge: base64url('register-challenge'),
  pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
  timeout: 60000,
  attestation: 'none',
  authenticatorSelection: {
    residentKey: 'required',
    userVerification: 'required',
  },
};

const authenticateWebauthn: Handler = async (route) => {
  await route.fulfill({ json: authenticationOptions });
};

const loginWebauthn: Handler = async (route) => {
  await route.fulfill({ json: { authenticated: true, redirectUrl: '/' } });
};

const registerWebauthnOptions: Handler = async (route) => {
  await route.fulfill({ json: registrationOptions });
};

// Stateful on purpose: the account screen reloads the session after registering, and the new
// passkey has to show up in the list it re-reads.
const registerWebauthn: Handler = async (route) => {
  session.passkeys.push({
    credentialId: base64url('new-passkey'),
    label:
      ((route.request().postDataJSON() as { publicKey?: { label?: string } }).publicKey?.label as string) ??
      'New passkey',
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  });

  await route.fulfill({ json: { success: true } });
};

const WEBAUTHN_ROUTES: { method: string; path: RegExp; handle: Handler }[] = [
  { method: 'POST', path: new RegExp('^/webauthn/authenticate/options$'), handle: authenticateWebauthn },
  { method: 'POST', path: new RegExp('^/login/webauthn$'), handle: loginWebauthn },
  { method: 'POST', path: new RegExp('^/webauthn/register/options$'), handle: registerWebauthnOptions },
  { method: 'POST', path: new RegExp('^/webauthn/register$'), handle: registerWebauthn },
];

const handleWebauthnRoute = async (route: Route): Promise<void> => {
  const request = route.request();
  const { pathname } = new URL(request.url());
  const method = request.method();

  for (const { method: expected, path, handle } of WEBAUTHN_ROUTES) {
    if (method === expected && path.test(pathname)) {
      return handle(route);
    }
  }

  return route.fulfill({ status: 404, json: { message: `unmocked route: ${method} ${pathname}` } });
};

export const getSession = (): typeof session => session;

export const mockWebauthn = async (page: Page): Promise<void> => {
  await page.route('**/webauthn/**', handleWebauthnRoute);
  await page.route('**/login/webauthn', handleWebauthnRoute);
};

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DOCUMENT, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { authRedirectInterceptor } from '@core/interceptors/auth-redirect-interceptor';

import { PasskeyCeremony } from './passkey-ceremony';

const requestOptionsJSON = {
  challenge: 'Y2hhbGxlbmdl',
  rpId: 'cairn.example',
  timeout: 60000,
  userVerification: 'preferred',
};
const creationOptionsJSON = {
  challenge: 'Y2hhbGxlbmdl',
  rp: { name: 'Cairn', id: 'cairn.example' },
  user: { id: 'dXNlcg', name: 'joan', displayName: 'Joan' },
  pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
};

const parsedRequestOptions = { challenge: new ArrayBuffer(0) };
const parsedCreationOptions = { challenge: new ArrayBuffer(0) };

const credentialJSON = { id: 'Y3JlZA', rawId: 'Y3JlZA', type: 'public-key' };

const notAllowedError = new DOMException('The operation was cancelled.', 'NotAllowedError');
const abortError = new DOMException('The operation was aborted.', 'AbortError');
const otherDomException = new DOMException('Something else broke.', 'UnknownError');

describe('PasskeyCeremony', () => {
  let ceremony: PasskeyCeremony;
  let http: HttpTestingController;
  let originalPublicKeyCredential: typeof PublicKeyCredential | undefined;
  let originalCredentials: typeof navigator.credentials;

  const installSupport = (get: unknown, create: unknown): void => {
    Object.defineProperty(window, 'PublicKeyCredential', {
      configurable: true,
      value: {
        parseRequestOptionsFromJSON: vi.fn().mockReturnValue(parsedRequestOptions),
        parseCreationOptionsFromJSON: vi.fn().mockReturnValue(parsedCreationOptions),
      },
    });
    Object.defineProperty(navigator, 'credentials', {
      configurable: true,
      value: { get, create },
    });
  };

  beforeEach(() => {
    originalPublicKeyCredential = window.PublicKeyCredential;
    originalCredentials = navigator.credentials;

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    ceremony = TestBed.inject(PasskeyCeremony);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    Object.defineProperty(window, 'PublicKeyCredential', { configurable: true, value: originalPublicKeyCredential });
    Object.defineProperty(navigator, 'credentials', { configurable: true, value: originalCredentials });
  });

  describe('authenticate', () => {
    it('should resolve ok when the server verifies the assertion', async () => {
      const credential = { toJSON: () => credentialJSON };
      installSupport(vi.fn().mockResolvedValue(credential), vi.fn());

      const outcome = ceremony.authenticate();

      const optionsRequest = await vi.waitFor(() => http.expectOne('/webauthn/authenticate/options'));
      expect(optionsRequest.request.method).toBe('POST');
      optionsRequest.flush(requestOptionsJSON);

      const loginRequest = await vi.waitFor(() => http.expectOne('/login/webauthn'));
      expect(loginRequest.request.method).toBe('POST');
      expect(loginRequest.request.body).toEqual(credentialJSON);
      loginRequest.flush({ authenticated: true, redirectUrl: '/' });

      await expect(outcome).resolves.toBe('ok');
    });

    it('should resolve refused on a 401 at verification', async () => {
      const credential = { toJSON: () => credentialJSON };
      installSupport(vi.fn().mockResolvedValue(credential), vi.fn());

      const outcome = ceremony.authenticate();

      (await vi.waitFor(() => http.expectOne('/webauthn/authenticate/options'))).flush(requestOptionsJSON);

      const loginRequest = await vi.waitFor(() => http.expectOne('/login/webauthn'));
      loginRequest.flush(null, { status: 401, statusText: 'Unauthorized' });

      await expect(outcome).resolves.toBe('refused');
    });

    it('should resolve refused when the server responds 200 but declines the assertion', async () => {
      const credential = { toJSON: () => credentialJSON };
      installSupport(vi.fn().mockResolvedValue(credential), vi.fn());

      const outcome = ceremony.authenticate();

      (await vi.waitFor(() => http.expectOne('/webauthn/authenticate/options'))).flush(requestOptionsJSON);

      const loginRequest = await vi.waitFor(() => http.expectOne('/login/webauthn'));
      loginRequest.flush({ authenticated: false, redirectUrl: '/login' });

      await expect(outcome).resolves.toBe('refused');
    });

    it('should resolve refused without triggering a full page reload, through the real interceptor chain', async () => {
      const assign = vi.fn();
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          provideHttpClient(withInterceptors([authRedirectInterceptor])),
          provideHttpClientTesting(),
          { provide: DOCUMENT, useValue: { defaultView: { location: { assign } } } },
        ],
      });
      ceremony = TestBed.inject(PasskeyCeremony);
      http = TestBed.inject(HttpTestingController);

      const credential = { toJSON: () => credentialJSON };
      installSupport(vi.fn().mockResolvedValue(credential), vi.fn());

      const outcome = ceremony.authenticate();

      (await vi.waitFor(() => http.expectOne('/webauthn/authenticate/options'))).flush(requestOptionsJSON);

      const loginRequest = await vi.waitFor(() => http.expectOne('/login/webauthn'));
      loginRequest.flush(null, { status: 401, statusText: 'Unauthorized' });

      await expect(outcome).resolves.toBe('refused');
      expect(assign).not.toHaveBeenCalled();
    });

    it('should resolve cancelled and send no second request when the user dismisses the prompt', async () => {
      installSupport(vi.fn().mockRejectedValue(notAllowedError), vi.fn());

      const outcome = ceremony.authenticate();

      (await vi.waitFor(() => http.expectOne('/webauthn/authenticate/options'))).flush(requestOptionsJSON);

      await expect(outcome).resolves.toBe('cancelled');
      http.expectNone('/login/webauthn');
    });

    it('should resolve cancelled when the browser aborts the prompt', async () => {
      installSupport(vi.fn().mockRejectedValue(abortError), vi.fn());

      const outcome = ceremony.authenticate();

      (await vi.waitFor(() => http.expectOne('/webauthn/authenticate/options'))).flush(requestOptionsJSON);

      await expect(outcome).resolves.toBe('cancelled');
    });

    it('should resolve unsupported when the browser has no PublicKeyCredential', async () => {
      Object.defineProperty(window, 'PublicKeyCredential', { configurable: true, value: undefined });

      const outcome = ceremony.authenticate();

      await expect(outcome).resolves.toBe('unsupported');
      http.expectNone('/webauthn/authenticate/options');
    });

    it('should resolve failed on a network error fetching options', async () => {
      installSupport(vi.fn(), vi.fn());

      const outcome = ceremony.authenticate();

      const optionsRequest = await vi.waitFor(() => http.expectOne('/webauthn/authenticate/options'));
      optionsRequest.flush(null, { status: 500, statusText: 'Server Error' });

      await expect(outcome).resolves.toBe('failed');
    });

    it('should resolve failed on any other rejection from the authenticator', async () => {
      installSupport(vi.fn().mockRejectedValue(otherDomException), vi.fn());

      const outcome = ceremony.authenticate();

      (await vi.waitFor(() => http.expectOne('/webauthn/authenticate/options'))).flush(requestOptionsJSON);

      await expect(outcome).resolves.toBe('failed');
    });
  });

  describe('register', () => {
    it('should resolve ok when the server accepts the registration', async () => {
      const credential = { toJSON: () => credentialJSON };
      installSupport(vi.fn(), vi.fn().mockResolvedValue(credential));

      const outcome = ceremony.register('MacBook');

      const optionsRequest = await vi.waitFor(() => http.expectOne('/webauthn/register/options'));
      expect(optionsRequest.request.method).toBe('POST');
      optionsRequest.flush(creationOptionsJSON);

      const registerRequest = await vi.waitFor(() => http.expectOne('/webauthn/register'));
      expect(registerRequest.request.method).toBe('POST');
      expect(registerRequest.request.body).toEqual({ publicKey: { credential: credentialJSON, label: 'MacBook' } });
      registerRequest.flush({ success: true });

      await expect(outcome).resolves.toBe('ok');
    });

    it('should resolve failed when the server reports success false', async () => {
      const credential = { toJSON: () => credentialJSON };
      installSupport(vi.fn(), vi.fn().mockResolvedValue(credential));

      const outcome = ceremony.register('MacBook');

      (await vi.waitFor(() => http.expectOne('/webauthn/register/options'))).flush(creationOptionsJSON);

      const registerRequest = await vi.waitFor(() => http.expectOne('/webauthn/register'));
      registerRequest.flush({ success: false });

      await expect(outcome).resolves.toBe('failed');
    });

    it('should resolve cancelled and send no second request when the user dismisses the prompt', async () => {
      installSupport(vi.fn(), vi.fn().mockRejectedValue(notAllowedError));

      const outcome = ceremony.register('MacBook');

      (await vi.waitFor(() => http.expectOne('/webauthn/register/options'))).flush(creationOptionsJSON);

      await expect(outcome).resolves.toBe('cancelled');
      http.expectNone('/webauthn/register');
    });

    it('should resolve unsupported when the browser has no PublicKeyCredential', async () => {
      Object.defineProperty(window, 'PublicKeyCredential', { configurable: true, value: undefined });

      const outcome = ceremony.register('MacBook');

      await expect(outcome).resolves.toBe('unsupported');
      http.expectNone('/webauthn/register/options');
    });

    it('should resolve failed on a network error fetching options', async () => {
      installSupport(vi.fn(), vi.fn());

      const outcome = ceremony.register('MacBook');

      const optionsRequest = await vi.waitFor(() => http.expectOne('/webauthn/register/options'));
      optionsRequest.flush(null, { status: 500, statusText: 'Server Error' });

      await expect(outcome).resolves.toBe('failed');
    });

    it('should resolve failed on any other rejection from the authenticator', async () => {
      installSupport(vi.fn(), vi.fn().mockRejectedValue(otherDomException));

      const outcome = ceremony.register('MacBook');

      (await vi.waitFor(() => http.expectOne('/webauthn/register/options'))).flush(creationOptionsJSON);

      await expect(outcome).resolves.toBe('failed');
    });
  });
});

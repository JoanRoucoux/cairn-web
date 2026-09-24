import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PasskeyCeremony, type PasskeyOutcome } from '@core/webauthn/passkey-ceremony';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { LoginStore } from './login-store';

describe('LoginStore', () => {
  let store: LoginStore;
  let httpTesting: HttpTestingController;
  let authenticate: ReturnType<typeof vi.fn<() => Promise<PasskeyOutcome>>>;

  beforeEach(() => {
    authenticate = vi.fn();
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PasskeyCeremony, useValue: { authenticate } },
        LoginStore,
      ],
    });
    store = TestBed.inject(LoginStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should post the credentials the way a form would, which is what Spring reads', async () => {
    store.form.username().value.set('joan');
    store.form.password().value.set('a-real-password');

    const signedIn = store.signIn();
    const request = await vi.waitFor(() => httpTesting.expectOne('/api/authenticate'));

    expect(request.request.headers.get('Content-Type')).toContain('application/x-www-form-urlencoded');
    expect(String(request.request.body)).toBe('username=joan&password=a-real-password');
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(await signedIn).toBe(true);
  });

  it('should send no request when the credentials are empty', async () => {
    const signedIn = await store.signIn();

    httpTesting.expectNone('/api/authenticate');
    expect(signedIn).toBe(false);
  });

  it('should report a refused password without reporting a breakdown', async () => {
    store.form.username().value.set('joan');
    store.form.password().value.set('wrong');

    const signedIn = store.signIn();
    (await vi.waitFor(() => httpTesting.expectOne('/api/authenticate'))).flush(null, {
      status: 401,
      statusText: 'Unauthorized',
    });

    expect(await signedIn).toBe(false);
    expect(store.refused()).toBe(true);
    expect(store.failed()).toBe(false);
    expect(store.form().submitting()).toBe(false);
  });

  it('should tell a breakdown apart from a refusal', async () => {
    store.form.username().value.set('joan');
    store.form.password().value.set('a-real-password');

    const signedIn = store.signIn();
    (await vi.waitFor(() => httpTesting.expectOne('/api/authenticate'))).flush(null, {
      status: 500,
      statusText: 'Server Error',
    });

    expect(await signedIn).toBe(false);
    expect(store.failed()).toBe(true);
    expect(store.refused()).toBe(false);
  });

  it('should clear the previous outcome before trying again', async () => {
    store.form.username().value.set('joan');
    store.form.password().value.set('wrong');
    const first = store.signIn();
    (await vi.waitFor(() => httpTesting.expectOne('/api/authenticate'))).flush(null, {
      status: 401,
      statusText: 'Unauthorized',
    });
    await first;

    const second = store.signIn();
    const request = await vi.waitFor(() => httpTesting.expectOne('/api/authenticate'));
    expect(store.refused()).toBe(false);
    request.flush(null, { status: 204, statusText: 'No Content' });
    await second;
  });

  it('should sign in once the passkey ceremony succeeds', async () => {
    authenticate.mockResolvedValue('ok');

    expect(await store.signInWithPasskey()).toBe(true);
    expect(store.passkeySubmitting()).toBe(false);
  });

  it('should report neither cancellation nor a message when the ceremony is dismissed', async () => {
    authenticate.mockResolvedValue('cancelled');

    expect(await store.signInWithPasskey()).toBe(false);
    expect(store.passkeyRefused()).toBe(false);
    expect(store.passkeyUnsupported()).toBe(false);
    expect(store.passkeyFailed()).toBe(false);
  });

  it('should report a refused passkey', async () => {
    authenticate.mockResolvedValue('refused');

    expect(await store.signInWithPasskey()).toBe(false);
    expect(store.passkeyRefused()).toBe(true);
  });

  it('should report an unsupported browser', async () => {
    authenticate.mockResolvedValue('unsupported');

    expect(await store.signInWithPasskey()).toBe(false);
    expect(store.passkeyUnsupported()).toBe(true);
  });

  it('should report a breakdown', async () => {
    authenticate.mockResolvedValue('failed');

    expect(await store.signInWithPasskey()).toBe(false);
    expect(store.passkeyFailed()).toBe(true);
  });

  it('should clear the previous passkey outcome before trying again', async () => {
    authenticate.mockResolvedValueOnce('refused');
    await store.signInWithPasskey();

    authenticate.mockResolvedValueOnce('ok');
    expect(await store.signInWithPasskey()).toBe(true);
    expect(store.passkeyRefused()).toBe(false);
  });

  it('should clear a stale password outcome when a passkey attempt runs', async () => {
    store.form.username().value.set('joan');
    store.form.password().value.set('wrong');
    const passwordAttempt = store.signIn();
    (await vi.waitFor(() => httpTesting.expectOne('/api/authenticate'))).flush(null, {
      status: 401,
      statusText: 'Unauthorized',
    });
    await passwordAttempt;
    expect(store.refused()).toBe(true);

    authenticate.mockResolvedValue('ok');
    await store.signInWithPasskey();

    expect(store.refused()).toBe(false);
  });

  it('should clear a stale passkey outcome when a password attempt runs', async () => {
    authenticate.mockResolvedValue('refused');
    await store.signInWithPasskey();
    expect(store.passkeyRefused()).toBe(true);

    store.form.username().value.set('joan');
    store.form.password().value.set('a-real-password');
    const passwordAttempt = store.signIn();
    (await vi.waitFor(() => httpTesting.expectOne('/api/authenticate'))).flush(null, {
      status: 204,
      statusText: 'No Content',
    });
    await passwordAttempt;

    expect(store.passkeyRefused()).toBe(false);
  });
});

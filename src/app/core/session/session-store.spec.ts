import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { SessionStore } from './session-store';

const session = {
  displayName: 'Joan Roucoux',
  initials: 'JR',
  username: 'joan',
  signInMethod: 'PASSKEY',
};

describe('SessionStore', () => {
  let store: SessionStore;
  let http: HttpTestingController;

  const settleSession = async (): Promise<void> => {
    const request = await vi.waitFor(() => http.expectOne('/api/session'));
    request.flush(session);
    await TestBed.inject(ApplicationRef).whenStable();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(SessionStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should expose the signed-in owner once the session resolves', async () => {
    await settleSession();

    expect(store.owner().displayName).toBe('Joan Roucoux');
    expect(store.owner().initials).toBe('JR');
  });

  it('should hold an empty identity while the session is in flight', async () => {
    expect(store.owner().initials).toBe('');

    await settleSession();
  });

  it('should expose the username and how the session was opened', async () => {
    await settleSession();

    expect(store.username()).toBe('joan');
    expect(store.signInMethod()).toBe('PASSKEY');
  });

  it('should be loading until the session resolves, then ready', async () => {
    expect(store.state()).toBe('loading');
    expect(store.username()).toBe('');
    expect(store.signInMethod()).toBeUndefined();

    await settleSession();

    expect(store.state()).toBe('ready');
  });

  it('should report an error instead of throwing when the session fails', async () => {
    (await vi.waitFor(() => http.expectOne('/api/session'))).flush(null, { status: 500, statusText: 'Server Error' });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.state()).toBe('error');
    expect(store.owner().initials).toBe('');
  });

  it('should post to the Spring Security logout endpoint', async () => {
    await settleSession();

    const signOut = store.signOut();

    const request = await vi.waitFor(() => http.expectOne('/logout'));
    expect(request.request.method).toBe('POST');
    request.flush(null);

    await expect(signOut).resolves.toBeUndefined();
  });

  it('should resolve even when logout fails, so the caller still leaves the app', async () => {
    await settleSession();

    const signOut = store.signOut();

    const request = await vi.waitFor(() => http.expectOne('/logout'));
    request.flush(null, { status: 500, statusText: 'Server Error' });

    await expect(signOut).resolves.toBeUndefined();
  });
});

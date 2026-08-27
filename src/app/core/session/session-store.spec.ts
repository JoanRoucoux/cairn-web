import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { SessionStore } from './session-store';

const session = {
  displayName: 'Joan Roucoux',
  initials: 'JR',
  passkeys: [
    { credentialId: 'aXBob25l', label: 'iPhone de Joan', createdAt: '2026-02-01T10:00:00Z', lastUsedAt: null },
    { credentialId: 'bWFj', label: 'MacBook', createdAt: '2026-02-02T10:00:00Z', lastUsedAt: null },
  ],
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
    expect(store.passkeys()).toEqual([]);

    await settleSession();
  });

  it('should list the registered passkeys', async () => {
    await settleSession();

    expect(store.passkeys()).toHaveLength(2);
    expect(store.passkeys()[0]?.label).toBe('iPhone de Joan');
  });

  it('should reload the session after revoking a passkey', async () => {
    await settleSession();

    const revoked = store.revokePasskey('bWFj');

    const request = await vi.waitFor(() => http.expectOne('/api/session/passkeys/bWFj'));
    expect(request.request.method).toBe('DELETE');
    request.flush(null);

    await expect(revoked).resolves.toBe(true);
    (await vi.waitFor(() => http.expectOne('/api/session'))).flush(session);
  });

  it('should report a refused revocation rather than throwing', async () => {
    await settleSession();

    const revoked = store.revokePasskey('aXBob25l');

    const request = await vi.waitFor(() => http.expectOne('/api/session/passkeys/aXBob25l'));
    request.flush(null, { status: 409, statusText: 'Conflict' });

    await expect(revoked).resolves.toBe(false);
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

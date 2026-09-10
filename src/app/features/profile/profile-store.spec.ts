import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { ProfileStore } from './profile-store';

const session = {
  displayName: 'Joan Roucoux',
  initials: 'JR',
  passkeys: [
    { credentialId: 'aXBob25l', label: 'iPhone de Joan', createdAt: '2026-02-01T10:00:00Z', lastUsedAt: null },
    { credentialId: 'bWFj', label: 'MacBook', createdAt: '2026-02-02T10:00:00Z', lastUsedAt: null },
  ],
};

describe('ProfileStore', () => {
  let store: ProfileStore;
  let httpTesting: HttpTestingController;

  const settleSession = async (): Promise<void> => {
    (await vi.waitFor(() => httpTesting.expectOne('/api/session'))).flush(session);
    await TestBed.inject(ApplicationRef).whenStable();
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule()],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), ProfileStore],
    });
    store = TestBed.inject(ProfileStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should expose the owner and the current theme', async () => {
    await settleSession();

    expect(store.owner().initials).toBe('JR');
    expect(store.theme()).toBe('system');
  });

  it('should list the registered passkeys', async () => {
    await settleSession();

    expect(store.passkeys()).toHaveLength(2);
  });

  it('should change the theme', async () => {
    store.setTheme('dark');

    expect(store.theme()).toBe('dark');

    await settleSession();
  });

  it('should revoke a passkey and reload the session', async () => {
    await settleSession();

    const revoked = store.revokePasskey('bWFj');

    (await vi.waitFor(() => httpTesting.expectOne('/api/session/passkeys/bWFj'))).flush(null);
    await revoked;

    (await vi.waitFor(() => httpTesting.expectOne('/api/session'))).flush(session);
    expect(store.revocationRefused()).toBe(false);
  });

  it('should report a refused revocation instead of pretending it worked', async () => {
    await settleSession();

    const revoked = store.revokePasskey('aXBob25l');

    (await vi.waitFor(() => httpTesting.expectOne('/api/session/passkeys/aXBob25l'))).flush(null, {
      status: 409,
      statusText: 'Conflict',
    });
    await revoked;

    expect(store.revocationRefused()).toBe(true);
  });

  it('should clear a previous refusal when a new revocation starts', async () => {
    await settleSession();

    const refused = store.revokePasskey('aXBob25l');
    (await vi.waitFor(() => httpTesting.expectOne('/api/session/passkeys/aXBob25l'))).flush(null, {
      status: 409,
      statusText: 'Conflict',
    });
    await refused;

    const accepted = store.revokePasskey('bWFj');
    expect(store.revocationRefused()).toBe(false);

    (await vi.waitFor(() => httpTesting.expectOne('/api/session/passkeys/bWFj'))).flush(null);
    await accepted;
    (await vi.waitFor(() => httpTesting.expectOne('/api/session'))).flush(session);
  });

  it('should sign the user out', async () => {
    await settleSession();

    const signedOut = store.signOut();

    (await vi.waitFor(() => httpTesting.expectOne('/logout'))).flush(null);

    await expect(signedOut).resolves.toBeUndefined();
  });
});

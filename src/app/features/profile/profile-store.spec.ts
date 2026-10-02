import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { ProfileStore } from './profile-store';
import { flushCall, settleProfile } from './profile-testing';

const passkeys = [
  {
    credentialId: 'aXBob25l',
    label: 'iPhone de Joan',
    createdAt: '2025-03-12T10:00:00Z',
    lastUsedAt: '2026-09-25T08:00:00Z',
    current: true,
    provider: 'ICLOUD_KEYCHAIN',
  },
  {
    credentialId: 'bWFj',
    label: 'MacBook',
    createdAt: '2025-03-12T10:05:00Z',
    lastUsedAt: '2026-09-24T20:00:00Z',
    current: false,
  },
  {
    credentialId: 'eXVi',
    label: 'YubiKey',
    createdAt: '2025-11-04T10:00:00Z',
    lastUsedAt: '2026-09-02T09:00:00Z',
    current: false,
    provider: 'SECURITY_KEY',
  },
  { credentialId: 'bmV2ZXI', label: 'Neuf', createdAt: '2026-09-20T10:00:00Z', lastUsedAt: null, current: false },
];

describe('ProfileStore', () => {
  let store: ProfileStore;
  let httpTesting: HttpTestingController;

  const settle = (instruments: object[] = []): Promise<void> => settleProfile(httpTesting, { passkeys, instruments });

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-09-25T17:42:00+02:00') });
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'fr-FR' },
        ProfileStore,
      ],
    });
    store = TestBed.inject(ProfileStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    vi.useRealTimers();
  });

  it('should expose the owner, how the session was opened and the current theme', async () => {
    await settle();

    expect(store.identityState()).toBe('ready');
    expect(store.owner().initials).toBe('JO');
    expect(store.username()).toBe('joan');
    expect(store.signInMethod()).toBe('PASSKEY');
    expect(store.theme()).toBe('system');
  });

  it('should offer French before English', async () => {
    await settle();

    expect(store.availableLanguages).toEqual(['fr', 'en']);
  });

  it('should count the instruments, and know nothing until they load', async () => {
    expect(store.instrumentCount()).toBeNull();

    await settle([{}, {}]);

    expect(store.instrumentCount()).toBe(2);
  });

  it('should view each passkey with its badge, provider and creation date', async () => {
    await settle();

    const [phone, macbook] = store.passkeys();

    expect(phone).toMatchObject({
      label: 'iPhone de Joan',
      current: true,
      provider: 'ICLOUD_KEYCHAIN',
      created: '12/03/2025',
    });
    expect(macbook).toMatchObject({ current: false, provider: null });
  });

  it('should phrase the last use against the Paris calendar day', async () => {
    await settle();

    expect(store.passkeys().map((passkey) => passkey.usage)).toEqual([
      { kind: 'today', date: '' },
      { kind: 'yesterday', date: '' },
      { kind: 'on', date: '02/09/2026' },
      { kind: 'never', date: '' },
    ]);
  });

  it('should count a use after midnight in Paris but before midnight UTC as today', async () => {
    await settleProfile(httpTesting, { passkeys: [{ ...passkeys[1]!, lastUsedAt: '2026-09-24T22:30:00Z' }] });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.passkeys()[0]?.usage.kind).toBe('today');
  });

  it('should follow the device scheme', async () => {
    await settle();

    expect(store.systemScheme()).toBe('light');
  });

  it('should change the theme', async () => {
    store.setTheme('dark');

    expect(store.theme()).toBe('dark');

    await settle();
  });

  it('should reflect and change the hide-amounts preference', async () => {
    expect(store.hideAmounts()).toBe(false);

    store.setHideAmounts(true);

    expect(store.hideAmounts()).toBe(true);
    expect(localStorage.getItem('cairn-hide-amounts')).toBe('1');

    await settle();
  });

  it('should reload only the passkeys on request', async () => {
    await settle();

    store.reloadPasskeys();

    await flushCall(httpTesting, '/api/session/passkeys', []);
    expect(store.passkeys()).toEqual([]);
  });

  it('should name no added passkey before one is added', async () => {
    await settle();

    expect(store.addedPasskeyId()).toBeNull();
  });

  it('should name the passkey that appears once an added one is reloaded, and keep it', async () => {
    const added = {
      credentialId: 'bmV3',
      label: 'iPad',
      createdAt: '2026-09-25T15:00:00Z',
      lastUsedAt: null,
      current: false,
    };
    await settle();

    store.passkeyAdded();
    TestBed.tick();

    expect(store.addedPasskeyId()).toBeNull();

    await flushCall(httpTesting, '/api/session/passkeys', [...passkeys, added]);
    expect(store.addedPasskeyId()).toBe('bmV3');

    store.reloadPasskeys();
    TestBed.tick();
    expect(store.addedPasskeyId()).toBe('bmV3');

    await flushCall(httpTesting, '/api/session/passkeys', [added]);
    expect(store.addedPasskeyId()).toBe('bmV3');
  });

  it('should name no passkey when the reload after an add brings nothing new', async () => {
    await settle();

    store.passkeyAdded();
    await flushCall(httpTesting, '/api/session/passkeys', passkeys);

    expect(store.addedPasskeyId()).toBeNull();
  });

  it('should keep the identity ready while the passkeys load', async () => {
    await flushCall(httpTesting, '/api/session', {
      displayName: 'Joan',
      initials: 'JO',
      username: 'joan',
      signInMethod: 'PASSKEY',
    });
    TestBed.tick();

    expect(store.identityState()).toBe('ready');
    expect(store.passkeysState()).toBe('loading');

    await flushCall(httpTesting, '/api/session/passkeys', passkeys);
    await flushCall(httpTesting, '/api/instruments', []);
  });

  it('should keep the identity ready when the passkeys fail, then recover on reload', async () => {
    await flushCall(httpTesting, '/api/session', {
      displayName: 'Joan',
      initials: 'JO',
      username: 'joan',
      signInMethod: 'PASSKEY',
    });
    await flushCall(httpTesting, '/api/session/passkeys', null, { status: 500 });
    await flushCall(httpTesting, '/api/instruments', []);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.identityState()).toBe('ready');
    expect(store.passkeysState()).toBe('error');
    expect(store.passkeys()).toEqual([]);

    store.reloadPasskeys();
    await flushCall(httpTesting, '/api/session/passkeys', passkeys);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.passkeysState()).toBe('ready');
  });

  it('should sign the user out', async () => {
    await settle();

    const signedOut = store.signOut();

    (await vi.waitFor(() => httpTesting.expectOne('/logout'))).flush(null);

    await expect(signedOut).resolves.toBeUndefined();
  });
});

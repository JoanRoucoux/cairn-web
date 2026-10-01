import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ProfilePasskeyDeleteStore } from './profile-passkey-delete-store';

describe('ProfilePasskeyDeleteStore', () => {
  let store: ProfilePasskeyDeleteStore;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        ProfilePasskeyDeleteStore,
      ],
    });
    store = TestBed.inject(ProfilePasskeyDeleteStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should delete the passkey', async () => {
    const removed = store.remove('bWFj');

    expect(store.deleting()).toBe(true);
    (await vi.waitFor(() => httpTesting.expectOne('/api/session/passkeys/bWFj'))).flush(null);

    await expect(removed).resolves.toBe(true);
    expect(store.deleting()).toBe(false);
    expect(store.refused()).toBe(false);
  });

  it('should report a generic failure apart from the only-key refusal', async () => {
    const failed = store.remove('bWFj');
    (await vi.waitFor(() => httpTesting.expectOne('/api/session/passkeys/bWFj'))).flush(null, {
      status: 500,
      statusText: 'Server Error',
    });

    await expect(failed).resolves.toBe(false);
    expect(store.failed()).toBe(true);
    expect(store.refused()).toBe(false);

    const accepted = store.remove('bWFj');
    expect(store.failed()).toBe(false);
    (await vi.waitFor(() => httpTesting.expectOne('/api/session/passkeys/bWFj'))).flush(null);
    await accepted;
  });

  it('should report a refusal and clear it on the next attempt', async () => {
    const refused = store.remove('aXBob25l');
    (await vi.waitFor(() => httpTesting.expectOne('/api/session/passkeys/aXBob25l'))).flush(null, {
      status: 409,
      statusText: 'Conflict',
    });

    await expect(refused).resolves.toBe(false);
    expect(store.refused()).toBe(true);

    const accepted = store.remove('bWFj');
    expect(store.refused()).toBe(false);
    (await vi.waitFor(() => httpTesting.expectOne('/api/session/passkeys/bWFj'))).flush(null);
    await accepted;
  });
});

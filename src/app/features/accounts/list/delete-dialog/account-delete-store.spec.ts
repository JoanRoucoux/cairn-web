import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AccountDeleteStore } from './account-delete-store';

describe('AccountDeleteStore', () => {
  let store: AccountDeleteStore;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        AccountDeleteStore,
      ],
    });
    store = TestBed.inject(AccountDeleteStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should delete the account', async () => {
    const removed = store.remove('a1');

    const request = await vi.waitFor(() => httpTesting.expectOne('/api/accounts/a1'));
    expect(request.request.method).toBe('DELETE');
    request.flush(null);

    await expect(removed).resolves.toBe(true);
    expect(store.deleting()).toBe(false);
  });

  it('should flag a refusal on a 422 without removing the account', async () => {
    const removed = store.remove('a1');

    (await vi.waitFor(() => httpTesting.expectOne('/api/accounts/a1'))).flush(null, {
      status: 422,
      statusText: 'Unprocessable',
    });

    await expect(removed).resolves.toBe(false);
    expect(store.refused()).toBe(true);
    expect(store.error()).toBe(false);
  });

  it('should report a generic failure on any other error', async () => {
    const removed = store.remove('a1');

    (await vi.waitFor(() => httpTesting.expectOne('/api/accounts/a1'))).flush(null, {
      status: 500,
      statusText: 'Server Error',
    });

    await expect(removed).resolves.toBe(false);
    expect(store.error()).toBe(true);
    expect(store.refused()).toBe(false);
  });
});

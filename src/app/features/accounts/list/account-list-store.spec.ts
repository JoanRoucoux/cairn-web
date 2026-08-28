import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AccountListStore } from './account-list-store';

describe('AccountListStore', () => {
  let store: AccountListStore;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), AccountListStore],
    });
    store = TestBed.inject(AccountListStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should expose the accounts returned by the API', async () => {
    TestBed.tick();
    httpTesting
      .expectOne('/api/accounts')
      .flush([{ id: 'a1', name: 'Saxo Investor', type: 'PEA', institution: 'Saxo Bank' }]);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.accounts.value()).toHaveLength(1);
  });

  it('should reload the list after creating an account', async () => {
    TestBed.tick();
    httpTesting.expectOne('/api/accounts').flush([]);
    await TestBed.inject(ApplicationRef).whenStable();

    const created = store.create('Fortuneo', 'LIVRET', 'Fortuneo');

    const request = await vi.waitFor(() => httpTesting.expectOne((candidate) => candidate.method === 'POST'));
    expect(request.request.body).toEqual({ name: 'Fortuneo', type: 'LIVRET', institution: 'Fortuneo' });
    request.flush({});

    await expect(created).resolves.toBe(true);
    await vi.waitFor(() => httpTesting.expectOne('/api/accounts').flush([]));
  });

  it('should report a refused account', async () => {
    TestBed.tick();
    httpTesting.expectOne('/api/accounts').flush([]);
    await TestBed.inject(ApplicationRef).whenStable();

    const created = store.create('', '', '');

    (await vi.waitFor(() => httpTesting.expectOne((candidate) => candidate.method === 'POST'))).flush(null, {
      status: 422,
      statusText: 'Unprocessable',
    });

    await expect(created).resolves.toBe(false);
    expect(store.error()).toBe(true);
  });
});

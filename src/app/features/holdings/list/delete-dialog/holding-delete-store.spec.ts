import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { HoldingDeleteStore } from './holding-delete-store';

describe('HoldingDeleteStore', () => {
  let store: HoldingDeleteStore;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        HoldingDeleteStore,
      ],
    });
    store = TestBed.inject(HoldingDeleteStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should delete the holding', async () => {
    const removed = store.remove('h1');

    const request = await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1'));
    expect(request.request.method).toBe('DELETE');
    request.flush(null);

    await expect(removed).resolves.toBe(true);
    expect(store.deleting()).toBe(false);
  });

  it('should report a failure without claiming success', async () => {
    const removed = store.remove('h1');

    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1'))).flush(null, {
      status: 500,
      statusText: 'Server Error',
    });

    await expect(removed).resolves.toBe(false);
    expect(store.error()).toBe(true);
    expect(store.deleting()).toBe(false);
  });
});

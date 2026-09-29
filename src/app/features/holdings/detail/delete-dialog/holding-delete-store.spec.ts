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

    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1'))).flush(null, {
      status: 204,
      statusText: 'No Content',
    });

    await expect(removed).resolves.toBe(true);
  });

  it('should report a generic failure', async () => {
    const removed = store.remove('h1');

    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1'))).flush(null, {
      status: 500,
      statusText: 'Server error',
    });

    await expect(removed).resolves.toBe(false);
    expect(store.error()).toBe(true);
  });
});

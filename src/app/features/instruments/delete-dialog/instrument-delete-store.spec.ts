import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { InstrumentDeleteStore } from './instrument-delete-store';

describe('InstrumentDeleteStore', () => {
  let store: InstrumentDeleteStore;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        InstrumentDeleteStore,
      ],
    });
    store = TestBed.inject(InstrumentDeleteStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should delete the instrument', async () => {
    const removed = store.remove('i1');

    const request = await vi.waitFor(() => httpTesting.expectOne('/api/instruments/i1'));
    expect(request.request.method).toBe('DELETE');
    request.flush(null);

    await expect(removed).resolves.toBe(true);
    expect(store.deleting()).toBe(false);
  });

  it('should report a failure without claiming success', async () => {
    const removed = store.remove('i1');

    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments/i1'))).flush(null, {
      status: 500,
      statusText: 'Server Error',
    });

    await expect(removed).resolves.toBe(false);
    expect(store.error()).toBe(true);
    expect(store.deleting()).toBe(false);
  });
});

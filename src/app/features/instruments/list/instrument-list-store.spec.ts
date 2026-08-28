import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { InstrumentListStore } from './instrument-list-store';

describe('InstrumentListStore', () => {
  let store: InstrumentListStore;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        InstrumentListStore,
      ],
    });
    store = TestBed.inject(InstrumentListStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should hold an empty list on error', async () => {
    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments'))).flush(null, {
      status: 500,
      statusText: 'Server Error',
    });

    await vi.waitFor(() => expect(store.instruments.error()).toBeDefined());
    expect(store.filteredInstruments()).toEqual([]);
  });
});

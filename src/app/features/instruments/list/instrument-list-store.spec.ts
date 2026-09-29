import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { InstrumentListStore } from './instrument-list-store';

const instruments = [
  { id: 'i1', name: 'BNP Paribas Easy S&P 500', isin: 'FR0011550185', assetClass: 'ETF', priceSource: 'YAHOO' },
  { id: 'i2', name: 'Société Générale', isin: 'FR0000130809', assetClass: 'EQUITY', priceSource: 'YAHOO' },
];

const holdings = [
  { id: 'h1', instrumentId: 'i1' },
  { id: 'h2', instrumentId: 'i1' },
];

describe('InstrumentListStore', () => {
  let store: InstrumentListStore;
  let httpTesting: HttpTestingController;

  const load = async (): Promise<void> => {
    TestBed.tick();
    httpTesting.expectOne('/api/instruments').flush(instruments);
    httpTesting.expectOne('/api/holdings').flush(holdings);
    await TestBed.inject(ApplicationRef).whenStable();
  };

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
    TestBed.tick();
    httpTesting.expectOne('/api/instruments').flush(null, { status: 500, statusText: 'Server Error' });
    httpTesting.expectOne('/api/holdings').flush([]);

    await vi.waitFor(() => expect(store.instruments.error()).toBeDefined());
    expect(store.filteredRows()).toEqual([]);
  });

  it('should count no holdings while the holdings call has not resolved', async () => {
    TestBed.tick();
    httpTesting.expectOne('/api/instruments').flush(instruments);
    httpTesting.expectOne('/api/holdings').flush(null, { status: 500, statusText: 'Server Error' });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.rows().every((row) => row.holdingCount === 0)).toBe(true);
  });

  it('should count the holdings backing each instrument', async () => {
    await load();

    expect(store.rows().find((row) => row.id === 'i1')?.holdingCount).toBe(2);
    expect(store.rows().find((row) => row.id === 'i2')?.holdingCount).toBe(0);
  });

  it('should filter the rows, ignoring accents and case', async () => {
    await load();

    store.search.set('societe');
    expect(store.filteredRows().map((row) => row.id)).toEqual(['i2']);
  });
});

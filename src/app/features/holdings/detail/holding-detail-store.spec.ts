import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { of } from 'rxjs';

import { HoldingDetailStore } from './holding-detail-store';

const holdings = [
  { id: 'h1', instrumentId: 'i1', instrumentName: 'BNP Paribas Easy S&P 500', marketValueEur: 22515.47 },
  { id: 'h2', instrumentId: 'i2', instrumentName: 'Amundi MSCI World Swap', marketValueEur: 19903 },
];

describe('HoldingDetailStore', () => {
  let store: HoldingDetailStore;
  let httpTesting: HttpTestingController;

  const configure = (holdingId?: string): void => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap(holdingId ? { holdingId } : {})) } },
        HoldingDetailStore,
      ],
    });
    store = TestBed.inject(HoldingDetailStore);
    httpTesting = TestBed.inject(HttpTestingController);
  };

  afterEach(() => httpTesting.verify());

  // Chained resources (holding -> instrument/quotes) fire their next request from an effect that
  // is only flushed once change detection and the microtask queue have both had a turn.
  const settle = async (): Promise<void> => {
    for (let i = 0; i < 10; i++) {
      TestBed.tick();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  };

  it('should read the holding id from the route', () => {
    configure('h2');

    expect(store.holdingId()).toBe('h2');
  });

  it('should leave the holding id undefined when the route carries none', () => {
    configure();

    expect(store.holdingId()).toBeUndefined();
  });

  it('should hold an empty holding and an empty series while loading', () => {
    configure('h1');

    expect(store.holding()).toBeUndefined();
    expect(store.points()).toEqual([]);
  });

  it('should pick the requested holding out of the list', async () => {
    configure('h2');
    TestBed.tick();
    httpTesting.expectOne('/api/holdings').flush(holdings);
    await settle();
    httpTesting.match((request) => request.url.includes('/quotes')).forEach((request) => request.flush([]));
    httpTesting.match((request) => request.url === '/api/instruments/i2').forEach((request) => request.flush({}));

    expect(store.holding()?.instrumentName).toBe('Amundi MSCI World Swap');
  });

  it('should leave the holding undefined when the id matches nothing', async () => {
    configure('nope');
    TestBed.tick();
    httpTesting.expectOne('/api/holdings').flush(holdings);
    await settle();

    expect(store.holding()).toBeUndefined();
  });

  it('should turn quotes into chart points', async () => {
    configure('h1');
    TestBed.tick();
    httpTesting.expectOne('/api/holdings').flush(holdings);
    await settle();
    httpTesting.match((request) => request.url === '/api/instruments/i1').forEach((request) => request.flush({}));
    await settle();
    httpTesting
      .match((request) => request.url.includes('/quotes'))
      .forEach((request) => request.flush([{ asOf: '2026-08-21', price: 33.3069 }]));
    await settle();

    expect(store.points()).toEqual([{ t: Date.parse('2026-08-21'), v: 33.3069 }]);
  });

  it('should fetch the whole history when the max range is picked', async () => {
    configure('h1');
    TestBed.tick();
    httpTesting.expectOne('/api/holdings').flush(holdings);
    await settle();
    httpTesting.match((request) => request.url === '/api/instruments/i1').forEach((request) => request.flush({}));
    httpTesting.match((request) => request.url.includes('/quotes')).forEach((request) => request.flush([]));
    await settle();

    store.range.set('max');
    await settle();

    expect(httpTesting.match((request) => request.url.includes('/quotes'))).toHaveLength(1);
    httpTesting.match((request) => request.url.includes('/quotes')).forEach((request) => request.flush([]));
  });

  it('should reload the holdings and the quotes', async () => {
    configure('h1');
    TestBed.tick();
    httpTesting.expectOne('/api/holdings').flush(holdings);
    await settle();
    httpTesting.match((request) => request.url === '/api/instruments/i1').forEach((request) => request.flush({}));
    httpTesting.match((request) => request.url.includes('/quotes')).forEach((request) => request.flush([]));
    await settle();

    store.reload();
    await settle();

    httpTesting.expectOne('/api/holdings').flush(holdings);
    httpTesting.match((request) => request.url.includes('/quotes')).forEach((request) => request.flush([]));
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { BehaviorSubject, of } from 'rxjs';

import { HoldingDetailStore } from './holding-detail-store';

const holdings = [
  { id: 'h1', instrumentId: 'i1', instrumentName: 'BNP Paribas Easy S&P 500', quantity: 2, marketValueEur: 22515.47 },
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

    expect(store.points()).toEqual([{ t: Date.parse('2026-08-21'), v: 66.6138 }]);
    expect(store.rangeChange()).toBeUndefined();
  });

  it('should plot the value of the line and summarise the change over the range', async () => {
    configure('h1');
    TestBed.tick();
    httpTesting.expectOne('/api/holdings').flush(holdings);
    await settle();
    httpTesting.match((request) => request.url === '/api/instruments/i1').forEach((request) => request.flush({}));
    await settle();
    httpTesting
      .match((request) => request.url.includes('/quotes'))
      .forEach((request) =>
        request.flush([
          { asOf: '2026-08-21', price: 50 },
          { asOf: '2026-09-21', price: 55 },
        ]),
      );
    await settle();

    expect(store.points().map((point) => point.v)).toEqual([100, 110]);
    expect(store.rangeChange()).toEqual({ amount: 10, ratio: 0.1 });
  });

  it('should leave the ratio unknown when the range starts at a zero value', async () => {
    configure('h1');
    TestBed.tick();
    httpTesting.expectOne('/api/holdings').flush(holdings);
    await settle();
    httpTesting.match((request) => request.url === '/api/instruments/i1').forEach((request) => request.flush({}));
    await settle();
    httpTesting
      .match((request) => request.url.includes('/quotes'))
      .forEach((request) =>
        request.flush([
          { asOf: '2026-08-21', price: 0 },
          { asOf: '2026-09-21', price: 5 },
        ]),
      );
    await settle();

    expect(store.rangeChange()).toEqual({ amount: 10, ratio: null });
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

  const loadWithQuotes = async (holdingId: string): Promise<void> => {
    configure(holdingId);
    TestBed.tick();
    httpTesting.expectOne('/api/holdings').flush(holdings);
    await settle();
    httpTesting
      .match((request) => /^\/api\/instruments\/i\d$/.test(request.url))
      .forEach((request) => request.flush({}));
    await settle();
    httpTesting
      .match((request) => request.url.includes('/quotes'))
      .forEach((request) => request.flush([{ asOf: '2026-08-21', price: 50 }]));
    await settle();
  };

  it('should keep the previous series while a new range loads', async () => {
    await loadWithQuotes('h1');
    const before = store.points();

    store.range.set('1y');
    await settle();

    expect(store.quotes.status()).toBe('loading');
    expect(store.points()).toEqual(before);

    httpTesting
      .match((request) => request.url.includes('/quotes'))
      .forEach((request) =>
        request.flush([
          { asOf: '2026-01-01', price: 10 },
          { asOf: '2026-02-01', price: 20 },
        ]),
      );
    await settle();

    expect(store.points().map((point) => point.v)).toEqual([20, 40]);
  });

  it('should keep the previous series when the new range fails', async () => {
    await loadWithQuotes('h1');
    const before = store.points();

    store.range.set('1y');
    await settle();
    httpTesting
      .match((request) => request.url.includes('/quotes'))
      .forEach((request) => request.flush(null, { status: 500, statusText: 'Server error' }));
    await settle();

    expect(store.quotes.status()).toBe('error');
    expect(store.quotesFailed()).toBe(true);
    expect(store.points()).toEqual(before);
    expect(store.shownRange()).toBe('1m');

    store.retryQuotes();
    await settle();
    httpTesting
      .match((request) => request.url.includes('/quotes'))
      .forEach((request) => request.flush([{ asOf: '2026-01-01', price: 10 }]));
    await settle();

    expect(store.quotesFailed()).toBe(false);
    expect(store.shownRange()).toBe('1y');
  });

  it('should keep the range of the series shown, and its variation, until the new range settles', async () => {
    configure('h1');
    TestBed.tick();
    httpTesting.expectOne('/api/holdings').flush(holdings);
    await settle();
    httpTesting
      .match((request) => /^\/api\/instruments\/i\d$/.test(request.url))
      .forEach((request) => request.flush({}));
    await settle();
    httpTesting
      .match((request) => request.url.includes('/quotes'))
      .forEach((request) =>
        request.flush([
          { asOf: '2026-08-21', price: 50 },
          { asOf: '2026-09-21', price: 55 },
        ]),
      );
    await settle();
    expect(store.rangeChange()).toEqual({ amount: 10, ratio: 0.1 });

    store.range.set('1y');
    await settle();

    expect(store.shownRange()).toBe('1m');
    expect(store.rangeChange()).toEqual({ amount: 10, ratio: 0.1 });

    httpTesting
      .match((request) => request.url.includes('/quotes'))
      .forEach((request) =>
        request.flush([
          { asOf: '2025-09-21', price: 10 },
          { asOf: '2026-09-21', price: 30 },
        ]),
      );
    await settle();

    expect(store.shownRange()).toBe('1y');
    expect(store.rangeChange()).toEqual({ amount: 40, ratio: 2 });
  });

  it('should drop the series of another instrument while its quotes load', async () => {
    const route = { paramMap: new BehaviorSubject(convertToParamMap({ holdingId: 'h1' })) };
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: route },
        HoldingDetailStore,
      ],
    });
    store = TestBed.inject(HoldingDetailStore);
    httpTesting = TestBed.inject(HttpTestingController);
    TestBed.tick();
    httpTesting.expectOne('/api/holdings').flush(holdings);
    await settle();
    httpTesting.match((request) => request.url === '/api/instruments/i1').forEach((request) => request.flush({}));
    await settle();
    httpTesting
      .match((request) => request.url.includes('/quotes'))
      .forEach((request) => request.flush([{ asOf: '2026-08-21', price: 50 }]));
    await settle();
    expect(store.points()).not.toEqual([]);

    route.paramMap.next(convertToParamMap({ holdingId: 'h2' }));
    await settle();

    expect(store.points()).toEqual([]);
    httpTesting.match((request) => request.url === '/api/instruments/i2').forEach((request) => request.flush({}));
    httpTesting.match((request) => request.url.includes('/quotes')).forEach((request) => request.flush([]));
    await settle();
  });
});

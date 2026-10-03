import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PortfolioStore } from './portfolio-store';

const point = (date: string, totalEur: number): object => ({ date, totalEur });

const history = (...points: object[]): object => ({ mode: 'constant-mix', reconstructed: false, points });

describe('PortfolioStore range reload', () => {
  let store: PortfolioStore;
  let httpTesting: HttpTestingController;

  const flushWhenSeen = (url: string, body: object): Promise<void> =>
    vi.waitFor(() => {
      const [request] = httpTesting.match((candidate) => candidate.url === url);
      expect(request).toBeDefined();
      request?.flush(body);
    });

  const load = async (body: object): Promise<void> => {
    TestBed.tick();
    await flushWhenSeen('/api/history', body);
    await vi.waitFor(() => expect(store.history.status()).toBe('resolved'));
  };

  const drain = async (): Promise<void> => {
    httpTesting
      .match(() => true)
      .filter((request) => !request.cancelled)
      .forEach((request) => request.flush({}));
    await TestBed.inject(ApplicationRef).whenStable();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), PortfolioStore],
    });
    store = TestBed.inject(PortfolioStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should keep the previous series, and flag a reload, while a new range loads', async () => {
    await load(history(point('2026-08-20', 100), point('2026-08-21', 110)));
    const before = store.points();
    expect(store.curveBlocking()).toBe(false);

    store.range.set('7d');
    TestBed.tick();

    expect(store.curveState()).toBe('loading');
    expect(store.curveReloading()).toBe(true);
    expect(store.curveBlocking()).toBe(false);
    expect(store.points()).toEqual(before);

    await flushWhenSeen('/api/history', history(point('2026-08-21', 5)));
    await vi.waitFor(() => expect(store.curveReloading()).toBe(false));

    expect(store.points()).toEqual([{ t: Date.parse('2026-08-21'), v: 5 }]);
    await drain();
  });

  it('should not flag a reload on the first load, nor over an empty series', async () => {
    expect(store.curveReloading()).toBe(false);

    await load(history());
    expect(store.curveBlocking()).toBe(false);
    store.range.set('7d');
    TestBed.tick();

    expect(store.curveReloading()).toBe(false);
    await drain();
  });

  it('should keep the variation and its range with the series, then swap both at once', async () => {
    await load(history(point('2026-08-20', 100), point('2026-08-21', 110)));
    expect(store.rangeChange()).toEqual({ eur: 10, ratio: 0.1 });
    expect(store.shownRange()).toBe('1m');

    store.range.set('1y');
    TestBed.tick();

    expect(store.shownRange()).toBe('1m');
    expect(store.rangeChange()).toEqual({ eur: 10, ratio: 0.1 });

    await flushWhenSeen('/api/history', history(point('2025-08-21', 100), point('2026-08-21', 300)));
    await vi.waitFor(() => expect(store.shownRange()).toBe('1y'));

    expect(store.rangeChange()).toEqual({ eur: 200, ratio: 2 });
    await drain();
  });

  it('should surface the error, not the old series, when the new range fails, and retry only that call', async () => {
    await load(history(point('2026-08-20', 100), point('2026-08-21', 110)));
    expect(store.curveBlocking()).toBe(false);

    store.range.set('1y');
    TestBed.tick();
    await vi.waitFor(() =>
      httpTesting
        .match((candidate) => candidate.url === '/api/history')[0]
        ?.flush(null, { status: 500, statusText: 'Server error' }),
    );
    await vi.waitFor(() => expect(store.curveState()).toBe('error'));

    expect(store.curveBlocking()).toBe(true);

    store.retryCurve();
    TestBed.tick();

    expect(store.curveState()).toBe('loading');
    expect(store.curveBlocking()).toBe(true);
    const retried = httpTesting.match((candidate) => candidate.url === '/api/history');
    expect(retried).toHaveLength(1);
    retried[0]?.flush(history(point('2025-08-21', 100), point('2026-08-21', 300)));
    await vi.waitFor(() => expect(store.curveState()).toBe('ready'));

    expect(store.curveBlocking()).toBe(false);
    expect(store.shownRange()).toBe('1y');
    await drain();
  });
});

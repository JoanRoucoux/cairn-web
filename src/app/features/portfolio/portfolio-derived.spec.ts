import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { PortfolioStore } from './portfolio-store';

let httpTesting: HttpTestingController;

const setup = (range?: '1d'): PortfolioStore => {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), PortfolioStore],
  });
  httpTesting = TestBed.inject(HttpTestingController);
  const store = TestBed.inject(PortfolioStore);
  if (range) {
    store.range.set(range);
  }
  TestBed.tick();

  return store;
};

const flushWhenSeen = (url: string, body: object): Promise<void> =>
  vi.waitFor(() => {
    const [request] = httpTesting.match((candidate) => candidate.url === url);
    expect(request).toBeDefined();
    request?.flush(body);
  });

const withHistory = async (totals: number[]): Promise<PortfolioStore> => {
  const store = setup();
  await flushWhenSeen('/api/history', {
    mode: 'constant-mix',
    reconstructed: false,
    points: totals.map((totalEur, index) => ({ date: `2026-08-${20 + index}`, totalEur })),
  });
  await vi.waitFor(() => expect(store.history.status()).toBe('resolved'));

  return store;
};

describe('PortfolioStore derived values', () => {
  it('should derive the change and its ratio from the first and last history points', async () => {
    const store = await withHistory([200, 250]);

    expect(store.rangeChange()).toEqual({ eur: 50, ratio: 0.25 });
  });

  it('should stay undefined with fewer than two history points', async () => {
    const store = await withHistory([200]);

    expect(store.rangeChange()).toBeUndefined();
  });

  it('should leave the ratio unknown when the history starts at zero', async () => {
    const store = await withHistory([0, 5]);

    expect(store.rangeChange()).toEqual({ eur: 5, ratio: null });
  });

  it('should take the one-day change from the performance total, which excludes lines without a previous close', async () => {
    const store = setup('1d');
    await flushWhenSeen('/api/history/intraday', {
      points: [
        { at: '2026-08-21T08:00:00Z', totalEur: 100 },
        { at: '2026-08-21T16:00:00Z', totalEur: 110 },
      ],
    });
    await flushWhenSeen('/api/portfolio/performance', {
      total: { valueEur: 110, changeEur: 10, changeRatio: 0.125 },
      byEnvelope: [],
    });
    await vi.waitFor(() => expect(store.performance.status()).toBe('resolved'));

    expect(store.rangeChange()).toEqual({ eur: 10, ratio: 0.125 });
  });

  it('should leave the one-day ratio unknown when the performance total has none', async () => {
    const store = setup('1d');
    await flushWhenSeen('/api/history/intraday', { points: [] });
    await flushWhenSeen('/api/portfolio/performance', {
      total: { valueEur: 110, changeEur: 10 },
      byEnvelope: [],
    });
    await vi.waitFor(() => expect(store.performance.status()).toBe('resolved'));

    expect(store.rangeChange()).toEqual({ eur: 10, ratio: null });
  });

  it('should fall back to the intraday points for the one-day change until performance settles', async () => {
    const store = setup('1d');
    await flushWhenSeen('/api/history/intraday', {
      points: [
        { at: '2026-08-21T08:00:00Z', totalEur: 100 },
        { at: '2026-08-21T16:00:00Z', totalEur: 110 },
      ],
    });
    await vi.waitFor(() => expect(store.history.status()).toBe('resolved'));

    expect(store.rangeChange()).toEqual({ eur: 10, ratio: 0.1 });
  });

  it('should keep API order between movers with the same absolute day change in percent', async () => {
    const store = setup();
    await flushWhenSeen('/api/holdings', [
      { id: 'a', dayChangeRatio: 0.01 },
      { id: 'b', dayChangeRatio: -0.01 },
      { id: 'c', dayChangeRatio: 0.01 },
    ] as unknown as HoldingResponse[]);
    await vi.waitFor(() => expect(store.holdings.status()).toBe('resolved'));

    expect(store.movers().map((holding) => holding.id)).toEqual(['a', 'b', 'c']);
  });

  it('should treat the curve as blocking until the history has resolved once, and again after an error', async () => {
    const store = setup();

    expect(store.curveBlocking()).toBe(true);

    await flushWhenSeen('/api/history', { mode: 'constant-mix', reconstructed: false, points: [] });
    await vi.waitFor(() => expect(store.history.status()).toBe('resolved'));
    TestBed.tick();

    expect(store.curveBlocking()).toBe(false);

    store.range.set('7d');
    TestBed.tick();

    expect(store.history.status()).toBe('loading');
    expect(store.curveBlocking()).toBe(false);
  });

  it('should become blocking again when the history fails', async () => {
    const store = setup();
    await vi.waitFor(() => {
      const [request] = httpTesting.match((candidate) => candidate.url === '/api/history');
      expect(request).toBeDefined();
      request?.flush(null, { status: 500, statusText: 'Server Error' });
    });
    await vi.waitFor(() => expect(store.history.status()).toBe('error'));
    TestBed.tick();

    expect(store.curveBlocking()).toBe(true);
  });
});

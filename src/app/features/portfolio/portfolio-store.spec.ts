import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, type TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { HistoryResponse, IntradayHistoryResponse, PortfolioResponse } from '@core/api-client/cairnAPI.schemas';

import { PortfolioStore } from './portfolio-store';

const portfolio = {
  totalEur: 278146.45,
  dayChangeEur: -712.98,
  dayChangeRatio: -0.0026,
  unrealizedGainEur: null,
  unrealizedGainRatio: null,
  staleCount: 2,
  generatedAt: '2026-08-21T20:00:00Z',
  byAssetClass: [],
  byAccount: [],
  holdings: [],
} as unknown as PortfolioResponse;

const performance = {
  range: '1d',
  from: '2026-08-20',
  to: '2026-08-21',
  reconstructed: false,
  lastPriceAt: '2026-08-21T16:32:00Z',
  total: { valueEur: 278146.45, changeEur: -712.98, changeRatio: -0.0026 },
  byEnvelope: [],
};

const intraday: IntradayHistoryResponse = {
  points: [
    { at: '2026-08-21T08:00:00Z', totalEur: 278859.43 },
    { at: '2026-08-21T16:00:00Z', totalEur: 278146.45 },
  ],
};

const history: HistoryResponse = {
  mode: 'constant-mix',
  reconstructed: false,
  points: [
    { date: '2026-08-20', totalEur: 278859.43 },
    { date: '2026-08-21', totalEur: 278146.45 },
  ],
};

describe('PortfolioStore', () => {
  let store: PortfolioStore;
  let httpTesting: HttpTestingController;

  const respondWith = (respond: (request: TestRequest) => void): void => {
    TestBed.tick();
    respond(portfolioRequest());
  };

  const portfolioRequest = (): TestRequest => httpTesting.expectOne((candidate) => candidate.url === '/api/portfolio');

  const flushIntraday = async (body: IntradayHistoryResponse = intraday): Promise<void> => {
    await vi.waitFor(() => httpTesting.match((candidate) => candidate.url === '/api/history/intraday')[0]?.flush(body));
  };

  const flushHistory = async (body: HistoryResponse = history): Promise<void> => {
    await vi.waitFor(() => httpTesting.match((candidate) => candidate.url === '/api/history')[0]?.flush(body));
  };

  const flushPerformance = async (): Promise<void> => {
    await vi.waitFor(() =>
      httpTesting.match((candidate) => candidate.url === '/api/portfolio/performance')[0]?.flush(performance),
    );
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), PortfolioStore],
    });
    store = TestBed.inject(PortfolioStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should start on the one-day range', () => {
    expect(store.range()).toBe('1d');
  });

  it('should expose the portfolio returned by the API', async () => {
    respondWith((candidate) => candidate.flush(portfolio));
    await flushIntraday();
    await flushPerformance();

    expect(store.portfolio.value()?.totalEur).toBe(278146.45);
  });

  it('should expose the performance returned by the API', async () => {
    respondWith((candidate) => candidate.flush(portfolio));
    await flushIntraday();
    await flushPerformance();

    expect(store.performance.value()?.total.changeEur).toBe(-712.98);
  });

  it('should load the intraday history for the default one-day range', async () => {
    respondWith((candidate) => candidate.flush(portfolio));
    await flushPerformance();

    const request = await vi.waitFor(() => {
      const [pending] = httpTesting.match((candidate) => candidate.url === '/api/history/intraday');
      expect(pending).toBeDefined();
      return pending as TestRequest;
    });

    expect(request.request.params.get('date')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    request.flush(intraday);
  });

  it('should turn intraday points into chart points', async () => {
    respondWith((candidate) => candidate.flush(portfolio));
    await flushIntraday();
    await flushPerformance();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.points()).toEqual([
      { t: Date.parse('2026-08-21T08:00:00Z'), v: 278859.43 },
      { t: Date.parse('2026-08-21T16:00:00Z'), v: 278146.45 },
    ]);
  });

  it('should switch to the constant-mix history for a range beyond one day', async () => {
    respondWith((candidate) => candidate.flush(portfolio));
    await flushIntraday();
    await flushPerformance();

    store.range.set('5y');
    TestBed.tick();

    await flushHistory();
    await vi.waitFor(() =>
      httpTesting.match((candidate) => candidate.url === '/api/portfolio/performance')[0]?.flush(performance),
    );
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.points()).toEqual([
      { t: Date.parse('2026-08-20'), v: 278859.43 },
      { t: Date.parse('2026-08-21'), v: 278146.45 },
    ]);
  });

  it('should flag a reconstructed series so the page can warn', async () => {
    respondWith((candidate) => candidate.flush(portfolio));
    await flushIntraday();
    await flushPerformance();

    store.range.set('5y');
    TestBed.tick();

    await vi.waitFor(() =>
      httpTesting
        .match((candidate) => candidate.url === '/api/history')[0]
        ?.flush({ mode: 'constant-mix', reconstructed: true, points: [{ date: '2021-08-21', totalEur: 1 }] }),
    );
    await vi.waitFor(() =>
      httpTesting.match((candidate) => candidate.url === '/api/portfolio/performance')[0]?.flush(performance),
    );
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.reconstructed()).toBe(true);
  });

  it('should reload the performance when the range changes', async () => {
    respondWith((candidate) => candidate.flush(portfolio));
    await flushIntraday();
    await flushPerformance();

    store.range.set('7d');
    TestBed.tick();

    await flushHistory();
    await vi.waitFor(() => {
      const pending = httpTesting.match((candidate) => candidate.url === '/api/portfolio/performance');
      expect(pending).toHaveLength(1);
      pending[0]?.flush({ ...performance, range: '7d' });
    });
  });

  it('should hold an empty series while the history is loading', () => {
    expect(store.points()).toEqual([]);
  });

  it('should flag the range-dependent resources as loading on a range switch, and clear it once both settle', async () => {
    respondWith((candidate) => candidate.flush(portfolio));
    await flushIntraday();
    await flushPerformance();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.rangeLoading()).toBe(false);

    store.range.set('7d');
    TestBed.tick();

    expect(store.rangeLoading()).toBe(true);

    await flushHistory();
    await vi.waitFor(() =>
      httpTesting.match((candidate) => candidate.url === '/api/portfolio/performance')[0]?.flush(performance),
    );
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.rangeLoading()).toBe(false);
  });
});

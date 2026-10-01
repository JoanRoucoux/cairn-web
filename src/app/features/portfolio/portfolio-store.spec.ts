import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, type TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type {
  HistoryResponse,
  HoldingResponse,
  IntradayHistoryResponse,
  PortfolioResponse,
} from '@core/api-client/cairnAPI.schemas';

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
  holdings: [{ id: 'h1' }],
} as unknown as PortfolioResponse;

const holdings = [
  { id: 'h1', dayChangeRatio: 0.012 },
  { id: 'h2', dayChangeRatio: -0.03 },
  { id: 'h3', dayChangeRatio: 0.001 },
  { id: 'h4', dayChangeRatio: null },
  { id: 'h5', dayChangeRatio: 0.0045 },
  { id: 'h6', dayChangeRatio: -0.0008 },
  { id: 'h7', dayChangeRatio: 0.02 },
] as unknown as HoldingResponse[];

const performance = {
  range: '1m',
  from: '2026-07-21',
  to: '2026-08-21',
  reconstructed: false,
  lastPriceAt: '2026-08-21T16:32:00Z',
  total: { valueEur: 278146.45, changeEur: -712.98, changeRatio: -0.0026 },
  byEnvelope: [{ accountType: 'PEA', valueEur: 278146.45, share: 1, changeEur: -712.98, changeRatio: -0.0026 }],
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

  const portfolioRequest = (): TestRequest => httpTesting.expectOne((candidate) => candidate.url === '/api/portfolio');

  const holdingsRequest = (): TestRequest => httpTesting.expectOne((candidate) => candidate.url === '/api/holdings');

  const flushPortfolio = (body: PortfolioResponse = portfolio, holdingsBody: HoldingResponse[] = holdings): void => {
    TestBed.tick();
    portfolioRequest().flush(body);
    holdingsRequest().flush(holdingsBody);
  };

  const flushIntraday = async (body: IntradayHistoryResponse = intraday): Promise<void> => {
    await vi.waitFor(() => httpTesting.match((candidate) => candidate.url === '/api/history/intraday')[0]?.flush(body));
  };

  const flushHistory = async (body: HistoryResponse = history): Promise<void> => {
    await vi.waitFor(() => httpTesting.match((candidate) => candidate.url === '/api/history')[0]?.flush(body));
  };

  const flushPerformance = async (body = performance): Promise<void> => {
    await vi.waitFor(() =>
      httpTesting.match((candidate) => candidate.url === '/api/portfolio/performance')[0]?.flush(body),
    );
  };

  const settle = async (): Promise<void> => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), PortfolioStore],
    });
    store = TestBed.inject(PortfolioStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should start on the one-month range', () => {
    expect(store.range()).toBe('1m');
  });

  it('should flag every block as loading before its response lands', () => {
    expect(store.totalState()).toBe('loading');
    expect(store.curveState()).toBe('loading');
    expect(store.envelopesState()).toBe('loading');
    expect(store.moversState()).toBe('loading');
  });

  it('should flag every block as ready once its response lands', async () => {
    flushPortfolio();
    await flushHistory();
    await flushPerformance();
    await settle();

    expect(store.totalState()).toBe('ready');
    expect(store.curveState()).toBe('ready');
    expect(store.envelopesState()).toBe('ready');
    expect(store.moversState()).toBe('ready');
  });

  it('should flag the total and movers blocks as empty when the portfolio has no holding', async () => {
    flushPortfolio({ ...portfolio, holdings: [] }, []);
    await flushHistory();
    await flushPerformance();
    await settle();

    expect(store.totalState()).toBe('empty');
    expect(store.moversState()).toBe('empty');
  });

  it('should flag the movers block as empty when no holding moved today', async () => {
    flushPortfolio(portfolio, [
      { id: 'h1', dayChangeRatio: 0 },
      { id: 'h2', dayChangeRatio: null },
    ] as unknown as HoldingResponse[]);
    await flushHistory();
    await flushPerformance();
    await settle();

    expect(store.moversState()).toBe('empty');
  });

  it('should flag the curve block as empty when the history has no point', async () => {
    flushPortfolio();
    await flushHistory({ ...history, points: [] });
    await flushPerformance();
    await settle();

    expect(store.curveState()).toBe('empty');
  });

  it('should flag the envelopes block as empty when there is no envelope', async () => {
    flushPortfolio();
    await flushHistory();
    await flushPerformance({ ...performance, byEnvelope: [] });
    await settle();

    expect(store.envelopesState()).toBe('empty');
  });

  it('should flag only the total block as errored when the portfolio call fails', async () => {
    TestBed.tick();
    portfolioRequest().flush(null, { status: 500, statusText: 'Server Error' });
    holdingsRequest().flush(holdings);
    await flushHistory();
    await flushPerformance();
    await settle();

    expect(store.totalState()).toBe('error');
    expect(store.moversState()).toBe('ready');
    expect(store.curveState()).toBe('ready');
    expect(store.envelopesState()).toBe('ready');
  });

  it('should flag only the movers block as errored when the holdings call fails', async () => {
    TestBed.tick();
    portfolioRequest().flush(portfolio);
    holdingsRequest().flush(null, { status: 500, statusText: 'Server Error' });
    await flushHistory();
    await flushPerformance();
    await settle();

    expect(store.moversState()).toBe('error');
    expect(store.totalState()).toBe('ready');
    expect(store.movers()).toEqual([]);
  });

  it('should flag allFailed only once the four calls have failed', async () => {
    TestBed.tick();
    portfolioRequest().flush(null, { status: 500, statusText: 'Server Error' });
    holdingsRequest().flush(null, { status: 500, statusText: 'Server Error' });
    await vi.waitFor(() => {
      const [request] = httpTesting.match((candidate) => candidate.url === '/api/history');
      expect(request).toBeDefined();
      request?.flush(null, { status: 500, statusText: 'Server Error' });
    });

    expect(store.allFailed()).toBe(false);

    await vi.waitFor(() => {
      const [request] = httpTesting.match((candidate) => candidate.url === '/api/portfolio/performance');
      expect(request).toBeDefined();
      request?.flush(null, { status: 500, statusText: 'Server Error' });
    });

    expect(store.allFailed()).toBe(true);
  });

  it('should reissue only GET /portfolio on retryTotal', async () => {
    flushPortfolio();
    await flushHistory();
    await flushPerformance();
    await settle();

    store.retryTotal();
    TestBed.tick();

    httpTesting.expectOne((candidate) => candidate.url === '/api/portfolio').flush(portfolio);
    httpTesting.verify();
  });

  it('should reissue only GET /holdings on retryMovers', async () => {
    flushPortfolio();
    await flushHistory();
    await flushPerformance();
    await settle();

    store.retryMovers();
    TestBed.tick();

    holdingsRequest().flush(holdings);
    httpTesting.verify();
  });

  it('should reissue only the history call on retryCurve', async () => {
    flushPortfolio();
    await flushHistory();
    await flushPerformance();
    await settle();

    store.retryCurve();
    TestBed.tick();

    await flushHistory();
  });

  it('should reissue only the performance call on retryEnvelopes', async () => {
    flushPortfolio();
    await flushHistory();
    await flushPerformance();
    await settle();

    store.retryEnvelopes();
    TestBed.tick();

    await flushPerformance();
  });

  it('should keep the five largest movers by absolute day change in percent, excluding null changes', async () => {
    flushPortfolio();
    await flushHistory();
    await flushPerformance();
    await settle();

    expect(store.movers().map((holding) => holding.id)).toEqual(['h2', 'h7', 'h1', 'h5', 'h3']);
  });

  it('should turn constant-mix history points into chart points by default', async () => {
    flushPortfolio();
    await flushHistory();
    await flushPerformance();
    await settle();

    expect(store.points()).toEqual([
      { t: Date.parse('2026-08-20'), v: 278859.43 },
      { t: Date.parse('2026-08-21'), v: 278146.45 },
    ]);
  });

  it('should switch to the intraday history for the one-day range', async () => {
    flushPortfolio();
    await flushHistory();
    await flushPerformance();

    store.range.set('1d');
    TestBed.tick();

    await flushIntraday();
    await flushPerformance({ ...performance, range: '1d' });
    await settle();

    expect(store.points()).toEqual([
      { t: Date.parse('2026-08-21T08:00:00Z'), v: 278859.43 },
      { t: Date.parse('2026-08-21T16:00:00Z'), v: 278146.45 },
    ]);
  });

  it('should request the whole available history for the max range', async () => {
    flushPortfolio();
    await flushHistory();
    await flushPerformance();

    store.range.set('max');
    TestBed.tick();

    const request = await vi.waitFor(() => {
      const [pending] = httpTesting.match((candidate) => candidate.url === '/api/history');
      expect(pending).toBeDefined();
      return pending as TestRequest;
    });
    expect(request.request.params.get('from')).toBe('1900-01-01');
    request.flush(history);
    await flushPerformance();
  });

  it('should flag a reconstructed series so the page can warn', async () => {
    flushPortfolio();
    await flushHistory();
    await flushPerformance();

    store.range.set('5y');
    TestBed.tick();

    await vi.waitFor(() =>
      httpTesting
        .match((candidate) => candidate.url === '/api/history')[0]
        ?.flush({ mode: 'constant-mix', reconstructed: true, points: [{ date: '2021-08-21', totalEur: 1 }] }),
    );
    await flushPerformance();
    await settle();

    expect(store.reconstructed()).toBe(true);
  });

  it('should never let a late response for an older range overwrite the currently selected one', async () => {
    flushPortfolio();
    await flushHistory();
    await flushPerformance();
    await settle();

    // `HttpTestingController.match()` consumes whatever it finds, so each request is captured the
    // moment it is first seen and acted on through that same reference - never re-queried by URL.
    const waitForPerformanceRequest = (range: string): Promise<TestRequest> =>
      vi.waitFor(() => {
        const [request] = httpTesting.match(
          (candidate) => candidate.url === '/api/portfolio/performance' && candidate.params.get('range') === range,
        );

        expect(request).toBeDefined();

        return request as TestRequest;
      });

    store.range.set('7d');
    TestBed.tick();
    const sevenDayRequest = await waitForPerformanceRequest('7d');

    store.range.set('1y');
    TestBed.tick();
    const oneYearRequest = await waitForPerformanceRequest('1y');

    // The newer range resolves first...
    oneYearRequest.flush({ ...performance, range: '1y' });
    await vi.waitFor(() => expect(store.envelopesState()).toBe('ready'));

    // ...and rxResource has already cancelled the older one by the time it would resolve late, out
    // of order: it never gets the chance to win, since it cannot even be flushed any more.
    expect(() => sevenDayRequest.flush({ ...performance, range: '7d' })).toThrow('cancelled');

    // The 7d /history request rxResource abandoned alongside its performance counterpart cannot be
    // flushed either; only the 1y one (if still pending) needs draining for `verify()`.
    httpTesting
      .match((candidate) => candidate.url === '/api/history')
      .forEach((request) => {
        try {
          request.flush(history);
        } catch {
          // Already cancelled: nothing to drain.
        }
      });
  });
});

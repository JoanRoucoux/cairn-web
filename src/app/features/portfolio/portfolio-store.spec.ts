import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, type TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { HistoryResponse, PortfolioResponse } from '@core/api-client/cairnAPI.schemas';

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
    respond(request());
  };

  const request = (): TestRequest => httpTesting.expectOne((candidate) => candidate.url === '/api/portfolio');

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
    await vi.waitFor(() => httpTesting.match((candidate) => candidate.url === '/api/history')[0]?.flush(history));

    expect(store.portfolio.value()?.totalEur).toBe(278146.45);
  });

  it('should turn history points into chart points', async () => {
    respondWith((candidate) => candidate.flush(portfolio));
    await vi.waitFor(() => httpTesting.match((candidate) => candidate.url === '/api/history')[0]?.flush(history));
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.points()).toEqual([
      { t: Date.parse('2026-08-20'), v: 278859.43 },
      { t: Date.parse('2026-08-21'), v: 278146.45 },
    ]);
  });

  it('should flag a reconstructed series so the page can warn', async () => {
    respondWith((candidate) => candidate.flush(portfolio));
    await vi.waitFor(() =>
      httpTesting
        .match((candidate) => candidate.url === '/api/history')[0]
        ?.flush({ mode: 'constant-mix', reconstructed: true, points: [{ date: '2021-08-21', totalEur: 1 }] }),
    );
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.reconstructed()).toBe(true);
  });

  it('should reload the history when the range changes', async () => {
    respondWith((candidate) => candidate.flush(portfolio));
    await vi.waitFor(() => httpTesting.match((candidate) => candidate.url === '/api/history')[0]?.flush(history));

    store.range.set('5y');
    TestBed.tick();

    await vi.waitFor(() => {
      const pending = httpTesting.match((candidate) => candidate.url === '/api/history');
      expect(pending).toHaveLength(1);
      pending[0]?.flush(history);
    });
  });

  it('should hold an empty series while the history is loading', () => {
    expect(store.points()).toEqual([]);
  });
});

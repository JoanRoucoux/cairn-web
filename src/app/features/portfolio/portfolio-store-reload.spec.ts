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
});

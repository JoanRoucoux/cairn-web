import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PortfolioStore } from './portfolio-store';

const withHistory = async (totals: number[]): Promise<PortfolioStore> => {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), PortfolioStore],
  });
  const store = TestBed.inject(PortfolioStore);
  const httpTesting = TestBed.inject(HttpTestingController);
  TestBed.tick();
  await vi.waitFor(() =>
    httpTesting
      .match((candidate) => candidate.url === '/api/history')[0]
      ?.flush({
        mode: 'constant-mix',
        reconstructed: false,
        points: totals.map((totalEur, index) => ({ date: `2026-08-${20 + index}`, totalEur })),
      }),
  );
  await vi.waitFor(() => expect(store.history.status()).toBe('resolved'));

  return store;
};

describe('PortfolioStore range change', () => {
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
});

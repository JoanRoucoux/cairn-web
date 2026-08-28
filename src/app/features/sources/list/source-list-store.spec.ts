import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { SourceListStore } from './source-list-store';

const holdings = [
  { id: 'h1', priceSource: 'YAHOO', priceAsOf: '2026-08-21', stale: false },
  { id: 'h2', priceSource: 'YAHOO', priceAsOf: '2026-08-20', stale: false },
  { id: 'h3', priceSource: 'SG_SIRIUS', priceAsOf: '2026-08-17', stale: true },
  { id: 'h4', priceSource: 'MANUAL', priceAsOf: null, stale: false },
] as unknown as HoldingResponse[];

describe('SourceListStore', () => {
  let store: SourceListStore;
  let httpTesting: HttpTestingController;

  const load = async (): Promise<void> => {
    TestBed.tick();
    httpTesting.expectOne('/api/holdings').flush(holdings);
    await vi.waitFor(() => httpTesting.match((request) => request.url.startsWith('/api/jobs/runs'))[0]?.flush([]));
    await TestBed.inject(ApplicationRef).whenStable();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), SourceListStore],
    });
    store = TestBed.inject(SourceListStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should group holdings by price source', async () => {
    await load();

    expect(store.sources().map((source) => source.source)).toEqual(['YAHOO', 'SG_SIRIUS', 'MANUAL']);
  });

  it('should count the lines each source feeds', async () => {
    await load();

    expect(store.sources()[0]!.lineCount).toBe(2);
  });

  it('should keep the most recent quote date per source', async () => {
    await load();

    expect(store.sources()[0]!.lastQuoteAt).toBe('2026-08-21');
  });

  it('should mark a source stale when any of its lines is', async () => {
    await load();

    expect(store.sources()[1]!.stale).toBe(true);
    expect(store.sources()[0]!.stale).toBe(false);
  });

  it('should report a source that never quotes without inventing a date', async () => {
    await load();

    expect(store.sources()[2]!.lastQuoteAt).toBeNull();
  });

  it('should reload the holdings after a manual refresh', async () => {
    await load();

    const refreshing = store.refresh();

    (await vi.waitFor(() => httpTesting.expectOne('/api/quotes/refresh'))).flush({
      refreshed: 21,
      skipped: 3,
      failures: [],
    });
    await refreshing;

    expect(store.report()?.refreshed).toBe(21);
    await vi.waitFor(() => httpTesting.expectOne('/api/holdings').flush(holdings));
    await vi.waitFor(() => httpTesting.match((request) => request.url.startsWith('/api/jobs/runs'))[0]?.flush([]));
  });

  it('should hold no sources while loading', () => {
    expect(store.sources()).toEqual([]);
  });
});

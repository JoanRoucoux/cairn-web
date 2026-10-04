import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, type TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { HoldingAddDialogStore } from './holding-add-dialog-store';

const accounts = [
  { id: 'a1', name: 'Northwind PEA', type: 'PEA', institution: 'Northwind Bank' },
  { id: 's1', name: 'Contoso Livret A', type: 'SAVINGS', institution: 'Contoso Bank' },
];

const tracked = {
  id: 'h1',
  accountId: 'a1',
  instrumentId: 'i1',
  instrumentName: 'Amundi MSCI World',
  isin: 'LU1681043599',
  sourceRef: 'CW8.PA',
  assetClass: 'ETF',
  priceSource: 'YAHOO',
  price: 528.31,
  priceCurrency: 'EUR',
};

const yahooHit = {
  name: 'iShares Core MSCI World',
  source: 'YAHOO',
  sourceRef: 'EUNL.DE',
  assetClass: 'ETF',
  currency: 'EUR',
};

describe('HoldingAddDialogStore search', () => {
  let store: HoldingAddDialogStore;
  let httpTesting: HttpTestingController;

  const searchOf = (source: string, query?: string): TestRequest =>
    httpTesting.expectOne(
      (request) =>
        request.url === '/api/instruments/search' &&
        request.params.get('source') === source &&
        (query === undefined || request.params.get('query') === query),
    );

  const load = async (holdings: unknown[] = [tracked]): Promise<void> => {
    TestBed.tick();
    httpTesting.expectOne('/api/accounts').flush(accounts);
    httpTesting.expectOne('/api/holdings').flush(holdings);
    await TestBed.inject(ApplicationRef).whenStable();
    vi.useFakeTimers();
  };

  const type = async (query: string): Promise<void> => {
    store.onQueryChange(query);
    await vi.advanceTimersByTimeAsync(300);
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        HoldingAddDialogStore,
      ],
    });
    store = TestBed.inject(HoldingAddDialogStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    vi.useRealTimers();
  });

  it('never offers a savings account', async () => {
    await load();

    expect(store.accounts.value().map((account) => account.id)).toEqual(['a1']);
  });

  it('waits 300 ms after the last keystroke, then asks each planned source once', async () => {
    await load();

    store.onQueryChange('ms');
    await vi.advanceTimersByTimeAsync(200);
    store.onQueryChange('msci');
    await vi.advanceTimersByTimeAsync(299);
    httpTesting.expectNone('/api/instruments/search', 'before the debounce');

    await vi.advanceTimersByTimeAsync(1);
    searchOf('YAHOO', 'msci').flush([]);
    searchOf('COINGECKO', 'msci').flush([]);
  });

  it('shows every planned source as loading until it answers, then its own state', async () => {
    await load();

    store.onQueryChange('msci');
    expect(store.groups().map((group) => group.state)).toEqual(['loading', 'loading']);

    await vi.advanceTimersByTimeAsync(300);
    searchOf('YAHOO').flush([yahooHit]);
    searchOf('COINGECKO').flush(null, { status: 502, statusText: 'Bad Gateway' });

    await vi.waitFor(() =>
      expect(store.groups().map((group) => [group.source, group.state])).toEqual([
        ['YAHOO', 'ready'],
        ['COINGECKO', 'error'],
      ]),
    );
  });

  it('tells an empty source from a failing one', async () => {
    await load([]);

    await type('zzz');
    searchOf('YAHOO').flush([]);
    searchOf('COINGECKO').flush([]);

    await vi.waitFor(() => expect(store.noneFound()).toBe(true));
    expect(store.groups()).toEqual([]);
  });

  it('retries only the failing source', async () => {
    await load();

    await type('msci');
    searchOf('YAHOO').flush([]);
    searchOf('COINGECKO').flush(null, { status: 502, statusText: 'Bad Gateway' });

    store.retry('COINGECKO');
    expect(store.groups().find((group) => group.source === 'COINGECKO')?.state).toBe('loading');
    searchOf('COINGECKO', 'msci').flush([]);
  });

  it('retries nothing for a source the query does not ask', async () => {
    await load();

    await type('msci');
    searchOf('YAHOO').flush([]);
    searchOf('COINGECKO').flush([]);

    store.retry('AMUNDI');
    httpTesting.expectNone('/api/instruments/search');
  });

  it('reuses what a source already answered when the chips change, asking only the new source', async () => {
    await load();

    await type('LU1681043599');
    searchOf('YAHOO').flush([]);
    searchOf('AMUNDI').flush([]);

    store.chooseFilter('YAHOO');
    store.chooseFilter('ALL');
    httpTesting.expectNone('/api/instruments/search');

    store.chooseFilter('COINGECKO');
    searchOf('COINGECKO', 'LU1681043599').flush([]);
  });

  it('lets a chip change during the debounce wait for it', async () => {
    await load();

    store.onQueryChange('solana');
    store.chooseFilter('COINGECKO');
    httpTesting.expectNone('/api/instruments/search');

    await vi.advanceTimersByTimeAsync(300);
    searchOf('COINGECKO', 'solana').flush([]);
  });

  it('never calls Amundi for a name and says why', async () => {
    await load();

    store.chooseFilter('AMUNDI');
    await type('amundi');

    httpTesting.expectNone('/api/instruments/search');
    expect(store.groups()).toEqual([{ source: 'AMUNDI', state: 'short', candidates: [] }]);
    expect(store.narrowed()).toBe(false);
  });

  it('offers every source when the chosen one has nothing', async () => {
    await load();

    store.chooseFilter('COINGECKO');
    await type('zzz');
    searchOf('COINGECKO').flush([]);

    await vi.waitFor(() => expect(store.narrowed()).toBe(true));
    expect(store.noneFound()).toBe(false);
  });

  it('lists the tracked titles first, and a tracked hit only there', async () => {
    await load();

    await type('msci');
    searchOf('YAHOO').flush([
      { ...yahooHit, name: 'Amundi MSCI World', sourceRef: 'CW8.PA', trackedInstrumentId: 'i1' },
    ]);
    searchOf('COINGECKO').flush([]);

    await vi.waitFor(() => expect(store.tracked().map((title) => title.instrumentId)).toEqual(['i1']));
    expect(store.groups()).toEqual([]);
    expect(store.noneFound()).toBe(false);
  });

  it('reports the tracked titles loading, then failing, and reloads them', async () => {
    TestBed.tick();
    httpTesting.expectOne('/api/accounts').flush(accounts);
    expect(store.trackedState()).toBe('loading');

    httpTesting.expectOne('/api/holdings').flush(null, { status: 500, statusText: 'Server Error' });
    await vi.waitFor(() => expect(store.trackedState()).toBe('error'));
    store.query.set('msci');
    expect(store.tracked()).toEqual([]);
    expect(store.groups().map((group) => group.state)).toEqual(['loading', 'loading']);

    store.retryTracked();
    TestBed.tick();
    httpTesting.expectOne('/api/holdings').flush([tracked]);
    await vi.waitFor(() => expect(store.trackedState()).toBe('ready'));
  });

  it('shows no results below two characters', async () => {
    await load();

    await type('m');

    expect(store.showResults()).toBe(false);
    expect(store.tracked()).toEqual([]);
    httpTesting.expectNone('/api/instruments/search');
  });

  it('stops a pending search when the dialog goes', async () => {
    await load();

    store.onQueryChange('msci');
    TestBed.resetTestingModule();
    await vi.advanceTimersByTimeAsync(300);

    httpTesting.expectNone('/api/instruments/search');
  });
});

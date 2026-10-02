import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AccountListStore } from './account-list-store';

const account = { id: 'a1', name: 'PEA Boursorama', type: 'PEA', institution: 'Boursorama' };

const holding = (overrides: Record<string, unknown> = {}): unknown => ({
  id: 'h1',
  accountId: 'a1',
  assetClass: 'ETF',
  priceSource: 'YAHOO',
  priceCurrency: 'EUR',
  marketValueEur: 100,
  ...overrides,
});

const cashHolding = (overrides: Record<string, unknown> = {}): unknown =>
  holding({
    id: 'h-cash',
    assetClass: 'CASH',
    priceSource: 'MANUAL',
    accountCash: true,
    marketValueEur: 50,
    ...overrides,
  });

describe('AccountListStore', () => {
  let store: AccountListStore;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), AccountListStore],
    });
    store = TestBed.inject(AccountListStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  const flush = async (
    holdings: unknown[],
    accounts: unknown[] = [account],
    totalEur = 350,
    unvaluedCount = 0,
    nonEurCount = 0,
  ): Promise<void> => {
    TestBed.tick();
    httpTesting.expectOne('/api/accounts').flush(accounts);
    httpTesting
      .expectOne('/api/portfolio')
      .flush({ totalEur, unvaluedCount, nonEurCount, byAssetClass: [], byAccount: [], holdings });
    await TestBed.inject(ApplicationRef).whenStable();
  };

  it('should be loading before both calls answer', () => {
    TestBed.tick();

    expect(store.state()).toBe('loading');
    httpTesting.expectOne('/api/accounts').flush([account]);
    httpTesting.expectOne('/api/portfolio').flush({ byAssetClass: [], byAccount: [], holdings: [] });
  });

  it('should stay ready, keeping the accounts, while a retry reloads', async () => {
    await flush([holding()]);

    store.retry();
    TestBed.tick();

    expect(store.state()).toBe('ready');
    expect(store.accounts()).toHaveLength(1);
    httpTesting.expectOne('/api/accounts').flush([account]);
    httpTesting
      .expectOne('/api/portfolio')
      .flush({ totalEur: 100, byAssetClass: [], byAccount: [], holdings: [holding()] });
    await TestBed.inject(ApplicationRef).whenStable();
  });

  it('should sum market values including cash and count lines excluding the EUR cash holding', async () => {
    await flush([holding(), holding({ id: 'h2', marketValueEur: 200 }), cashHolding()]);

    expect(store.accounts()).toEqual([
      {
        id: 'a1',
        name: 'PEA Boursorama',
        type: 'PEA',
        institution: 'Boursorama',
        valueEur: 350,
        share: 1,
        lineCount: 2,
        unvaluedCount: 0,
        nonEurCount: 0,
        excludedLineId: null,
      },
    ]);
  });

  it('should count zero lines for an account holding only its EUR cash balance, while its value still includes it', async () => {
    await flush([cashHolding()]);

    expect(store.accounts()).toEqual([
      {
        id: 'a1',
        name: 'PEA Boursorama',
        type: 'PEA',
        institution: 'Boursorama',
        valueEur: 50,
        share: 50 / 350,
        lineCount: 0,
        unvaluedCount: 0,
        nonEurCount: 0,
        excludedLineId: null,
      },
    ]);
  });

  it('should count a savings booklet as a line, although it is cash in euros too', async () => {
    await flush([cashHolding({ id: 'h-livret', accountCash: false, marketValueEur: 20000 })]);

    expect(store.accounts()[0]!.lineCount).toBe(1);
  });

  it('should sum the lines that have a EUR value and count the unpriced one it leaves out', async () => {
    await flush([holding(), holding({ id: 'h2', marketValueEur: null, priceCurrency: null })], [account], 100, 1);

    expect(store.accounts()[0]).toMatchObject({
      valueEur: 100,
      share: 1,
      lineCount: 2,
      unvaluedCount: 1,
      nonEurCount: 0,
      excludedLineId: 'h2',
    });
  });

  it('should count a line quoted in another currency apart from an unpriced one', async () => {
    await flush(
      [
        holding(),
        holding({ id: 'h2', marketValueEur: undefined, priceCurrency: 'USD' }),
        holding({ id: 'h3', marketValueEur: null, priceCurrency: null }),
      ],
      [account],
      100,
      1,
      1,
    );

    expect(store.accounts()[0]).toMatchObject({
      valueEur: 100,
      unvaluedCount: 1,
      nonEurCount: 1,
      excludedLineId: null,
    });
  });

  it('should point the caption at the only line left out, whatever the reason', async () => {
    await flush(
      [holding(), holding({ id: 'h2', marketValueEur: undefined, priceCurrency: 'USD' })],
      [account],
      100,
      0,
      1,
    );

    expect(store.accounts()[0]).toMatchObject({ unvaluedCount: 0, nonEurCount: 1, excludedLineId: 'h2' });
  });

  it('should not count the cash balance among the lines left out', async () => {
    await flush([cashHolding(), holding({ marketValueEur: null, priceCurrency: null })]);

    expect(store.accounts()[0]).toMatchObject({ valueEur: 50, unvaluedCount: 1, lineCount: 1 });
  });

  it('should give no share to an account whose lines are all left out or that is empty', async () => {
    const empty = { ...account, id: 'a2', name: 'Vide' };
    await flush([holding({ marketValueEur: null, priceCurrency: null })], [account, empty], 100, 1);

    expect(store.accounts().map((view) => [view.valueEur, view.share])).toEqual([
      [0, null],
      [0, null],
    ]);
  });

  it('should share the portfolio total by the partial value of the account', async () => {
    await flush([holding({ marketValueEur: 25 }), holding({ id: 'h2', marketValueEur: null })], [account], 100, 1);

    expect(store.accounts()[0]!.share).toBe(0.25);
  });

  it('should order accounts by partial value, largest first, ties keeping the account order', async () => {
    const small = { ...account, id: 'a2', name: 'Petit' };
    const empty = { ...account, id: 'a3', name: 'Vide' };
    const unknown = { ...account, id: 'a4', name: 'Inconnu' };
    await flush(
      [
        holding({ accountId: 'a2', marketValueEur: 10 }),
        holding({ id: 'h3', accountId: 'a1', marketValueEur: 90 }),
        holding({ id: 'h4', accountId: 'a4', marketValueEur: null }),
      ],
      [unknown, empty, small, account],
      100,
    );

    expect(store.accounts().map((view) => view.name)).toEqual(['PEA Boursorama', 'Petit', 'Inconnu', 'Vide']);
  });

  it('should hold no account while a call is pending', async () => {
    TestBed.tick();

    expect(store.accounts()).toEqual([]);

    httpTesting.expectOne('/api/accounts').flush([account, { ...account, id: 'a2', name: 'Second' }]);
    httpTesting.expectOne('/api/portfolio').flush({
      totalEur: 10,
      byAssetClass: [],
      byAccount: [],
      holdings: [holding({ marketValueEur: null }), holding({ id: 'h2', accountId: 'a2', marketValueEur: null })],
    });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.accounts().map((view) => view.valueEur)).toEqual([0, 0]);
  });

  it('should expose the portfolio total once loaded and nothing before', async () => {
    TestBed.tick();

    expect(store.totalEur()).toBeNull();
    httpTesting.expectOne('/api/accounts').flush([]);
    httpTesting
      .expectOne('/api/portfolio')
      .flush({ totalEur: 164294.28, byAssetClass: [], byAccount: [], holdings: [] });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.totalEur()).toBe(164294.28);
  });

  it('should expose what the total leaves out, nothing before the portfolio answers', async () => {
    TestBed.tick();

    expect(store.excluded()).toEqual({ unvaluedCount: 0, nonEurCount: 0 });
    httpTesting.expectOne('/api/accounts').flush([]);
    httpTesting
      .expectOne('/api/portfolio')
      .flush({ totalEur: 10, unvaluedCount: 2, nonEurCount: 1, byAssetClass: [], byAccount: [], holdings: [] });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.excluded()).toEqual({ unvaluedCount: 2, nonEurCount: 1 });
  });

  it('should report the empty state once loaded with no account', async () => {
    TestBed.tick();
    httpTesting.expectOne('/api/accounts').flush([]);
    httpTesting.expectOne('/api/portfolio').flush({ byAssetClass: [], byAccount: [], holdings: [] });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.state()).toBe('empty');
  });

  it('should report the error state when either call fails', async () => {
    TestBed.tick();
    httpTesting.expectOne('/api/accounts').flush(null, { status: 500, statusText: 'Server Error' });
    httpTesting.expectOne('/api/portfolio').flush({ byAssetClass: [], byAccount: [], holdings: [] });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.state()).toBe('error');
  });

  it('should go back to loading on a retry after an error, then to content', async () => {
    TestBed.tick();
    httpTesting.expectOne('/api/accounts').flush(null, { status: 500, statusText: 'Server error' });
    httpTesting
      .expectOne('/api/portfolio')
      .flush({ totalEur: 100, byAssetClass: [], byAccount: [], holdings: [holding()] });
    await TestBed.inject(ApplicationRef).whenStable();
    expect(store.state()).toBe('error');

    store.retry();
    TestBed.tick();

    expect(store.state()).toBe('loading');
    httpTesting.expectOne('/api/accounts').flush([account]);
    httpTesting
      .expectOne('/api/portfolio')
      .flush({ totalEur: 100, byAssetClass: [], byAccount: [], holdings: [holding()] });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.state()).toBe('ready');
  });

  it('should reload both calls on retry', async () => {
    await flush([]);

    store.retry();

    await vi.waitFor(() => httpTesting.expectOne('/api/accounts')).then((request) => request.flush([account]));
    await vi
      .waitFor(() => httpTesting.expectOne('/api/portfolio'))
      .then((request) => request.flush({ byAssetClass: [], byAccount: [], holdings: [] }));
  });
});

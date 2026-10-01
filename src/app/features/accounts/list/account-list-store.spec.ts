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

  const flush = async (holdings: unknown[], accounts: unknown[] = [account], totalEur = 350): Promise<void> => {
    TestBed.tick();
    httpTesting.expectOne('/api/accounts').flush(accounts);
    httpTesting.expectOne('/api/portfolio').flush({ totalEur, byAssetClass: [], byAccount: [], holdings });
    await TestBed.inject(ApplicationRef).whenStable();
  };

  it('should be loading before both calls answer', () => {
    TestBed.tick();

    expect(store.state()).toBe('loading');
    httpTesting.expectOne('/api/accounts').flush([account]);
    httpTesting.expectOne('/api/portfolio').flush({ byAssetClass: [], byAccount: [], holdings: [] });
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
      },
    ]);
  });

  it('should count a savings booklet as a line, although it is cash in euros too', async () => {
    await flush([cashHolding({ id: 'h-livret', accountCash: false, marketValueEur: 20000 })]);

    expect(store.accounts()[0]!.lineCount).toBe(1);
  });

  it('should report a null value when a line is unvalued rather than a partial sum', async () => {
    await flush([holding(), holding({ id: 'h2', marketValueEur: null })]);

    expect(store.accounts()[0]!.valueEur).toBeNull();
  });

  it('should give no share to an account whose value is unknown or zero', async () => {
    const empty = { ...account, id: 'a2', name: 'Vide' };
    await flush([holding(), holding({ id: 'h2', marketValueEur: null })], [account, empty]);

    expect(store.accounts().map((view) => view.share)).toEqual([null, null]);
  });

  it('should order accounts by value, largest first, the empty one then the unknown one last', async () => {
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

    expect(store.accounts().map((view) => view.name)).toEqual(['PEA Boursorama', 'Petit', 'Vide', 'Inconnu']);
  });

  it('should hold no account while a call is pending, and order several unknown values together', async () => {
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

    expect(store.accounts().map((view) => view.valueEur)).toEqual([null, null]);
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

  it('should reload both calls on retry', async () => {
    await flush([]);

    store.retry();

    await vi.waitFor(() => httpTesting.expectOne('/api/accounts')).then((request) => request.flush([account]));
    await vi
      .waitFor(() => httpTesting.expectOne('/api/portfolio'))
      .then((request) => request.flush({ byAssetClass: [], byAccount: [], holdings: [] }));
  });
});

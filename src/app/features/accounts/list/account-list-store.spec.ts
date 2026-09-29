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

  const flush = async (holdings: unknown[]): Promise<void> => {
    TestBed.tick();
    httpTesting.expectOne('/api/accounts').flush([account]);
    httpTesting.expectOne('/api/portfolio').flush({ byAssetClass: [], byAccount: [], holdings });
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
      { id: 'a1', name: 'PEA Boursorama', type: 'PEA', institution: 'Boursorama', valueEur: 350, lineCount: 2 },
    ]);
  });

  it('should count zero lines for an account holding only its EUR cash balance, while its value still includes it', async () => {
    await flush([cashHolding()]);

    expect(store.accounts()).toEqual([
      { id: 'a1', name: 'PEA Boursorama', type: 'PEA', institution: 'Boursorama', valueEur: 50, lineCount: 0 },
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

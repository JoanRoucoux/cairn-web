import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { of } from 'rxjs';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { HoldingChanges } from '../holding-changes';
import { HoldingListStore } from './holding-list-store';

const accountName: Record<string, string> = { a1: 'Northwind PEA', a2: 'Woodgrove Savings Plan', a3: 'Livret A' };
const accountType: Record<string, string> = { a1: 'PEA', a2: 'PEE', a3: 'SAVINGS' };

const line = (id: string, accountId: string, assetClass: string, name: string, value: number | null): unknown => ({
  id,
  accountId,
  accountName: accountName[accountId],
  accountType: accountType[accountId],
  instrumentName: name,
  isin: `ISIN-${id}`,
  assetClass,
  marketValueEur: value,
  stale: false,
});

const cash = (accountId: string, amount: number): unknown => ({
  ...(line(`cash-${accountId}`, accountId, 'CASH', 'Euros', amount) as object),
  accountCash: true,
  quantity: amount,
});

const holdings = [
  line('h1', 'a1', 'ETF', 'Amundi MSCI World', 1000),
  line('h2', 'a1', 'ETF', 'iShares Core S&P 500', 3000),
  line('h3', 'a1', 'CRYPTO', 'Ethereum', 500),
  line('h4', 'a2', 'FUND', 'FCPE Actions', 2000),
  line('h5', 'a2', 'EQUITY', 'TotalEnergies', null),
  line('h6', 'a3', 'CASH', 'Livret A', 700),
  cash('a1', 250),
  cash('a2', 50),
  cash('a3', 10),
] as HoldingResponse[];

const accounts = [
  { id: 'a1', name: 'Northwind PEA', type: 'PEA', institution: 'Northwind Bank' },
  { id: 'a2', name: 'Woodgrove Savings Plan', type: 'PEE', institution: 'Woodgrove Bank' },
  { id: 'a3', name: 'Livret A', type: 'SAVINGS', institution: 'Woodgrove Bank' },
];

describe('HoldingListStore account filter', () => {
  let store: HoldingListStore;
  let httpTesting: HttpTestingController;

  const open = async (
    queryParams: Record<string, string> = {},
    data: HoldingResponse[] = holdings,
    accountsAnswer: 'ok' | 'pending' | 'error' = 'ok',
  ): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        HoldingChanges,
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap(queryParams)) } },
        HoldingListStore,
      ],
    });
    store = TestBed.inject(HoldingListStore);
    httpTesting = TestBed.inject(HttpTestingController);
    TestBed.tick();
    httpTesting.expectOne('/api/holdings').flush(data);
    const accountsCall = httpTesting.expectOne('/api/accounts');

    if (accountsAnswer === 'ok') {
      accountsCall.flush(accounts);
    } else if (accountsAnswer === 'error') {
      accountsCall.flush(null, { status: 500, statusText: 'Server Error' });
    }
    if (accountsAnswer === 'pending') {
      TestBed.tick();
    } else {
      await TestBed.inject(ApplicationRef).whenStable();
    }
  };

  afterEach(() => {
    httpTesting.match('/api/accounts').forEach((request) => request.flush([]));
    httpTesting.verify();
  });

  it('should list every account as a choice, in the order of the accounts list', async () => {
    await open();

    expect(store.accountOptions()).toEqual([
      { id: 'a1', name: 'Northwind PEA' },
      { id: 'a2', name: 'Woodgrove Savings Plan' },
      { id: 'a3', name: 'Livret A' },
    ]);
    expect(store.account()).toBeNull();
    expect(store.accountName()).toBeNull();
    expect(store.foldLocked()).toBe(false);
    expect(store.knownAccountIds()).toEqual(['a1', 'a2', 'a3']);
  });

  it('should keep only the account of ?compte=, with its name, and lock the folds', async () => {
    await open({ compte: 'a2' });

    expect(store.groups().map((group) => group.accountId)).toEqual(['a2']);
    expect(store.accountName()).toBe('Woodgrove Savings Plan');
    expect(store.foldLocked()).toBe(true);
    expect(store.unknownAccountParam()).toBe(false);
    expect(store.classCounts().total).toBe(9);
  });

  it('should combine the account with the class and the search', async () => {
    await open({ compte: 'a1', classe: 'etf' });
    store.search.set('amundi');

    expect(store.groups().map((group) => group.holdings.map((holding) => holding.id))).toEqual([['h1']]);
    expect(store.classSummary()).toEqual(expect.objectContaining({ accounts: 1 }));
    expect(store.filterKey()).toBe('amundi|ETF|a1');
  });

  it('should flag an account no list knows, and filter on nothing', async () => {
    await open({ compte: 'nope' });

    expect(store.account()).toBeNull();
    expect(store.unknownAccountParam()).toBe(true);
    expect(store.groups()).toHaveLength(3);
  });

  it('should trust ?compte= while the accounts load, naming it from the holdings', async () => {
    await open({ compte: 'a2' }, holdings, 'pending');

    expect(store.account()).toBe('a2');
    expect(store.accountName()).toBe('Woodgrove Savings Plan');
    expect(store.knownAccountIds()).toBeNull();
    expect(store.securitiesAccount()).toBe('a2');
  });

  it('should name nothing for an account neither call knows yet', async () => {
    await open({ compte: 'a9' }, [], 'pending');

    expect(store.accountName()).toBeNull();
  });

  it('should keep ?compte= when the accounts fail, never pruning on a failure', async () => {
    await open({ compte: 'a2' }, holdings, 'error');

    expect(store.account()).toBe('a2');
    expect(store.knownAccountIds()).toBeNull();
  });

  it('should hand a securities account to Ajouter une ligne, never a savings account or none', async () => {
    await open({ compte: 'a1' });
    expect(store.securitiesAccount()).toBe('a1');

    await open({ compte: 'a3' });
    expect(store.securitiesAccount()).toBeNull();

    await open();
    expect(store.securitiesAccount()).toBeNull();
  });

  it('should lock the folds under a class or a search, not under blanks', async () => {
    await open({ classe: 'etf' });
    expect(store.foldLocked()).toBe(true);

    await open();
    store.search.set('   ');
    expect(store.foldLocked()).toBe(false);
    store.search.set('amundi');
    expect(store.foldLocked()).toBe(true);
  });
});

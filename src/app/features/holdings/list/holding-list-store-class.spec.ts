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

describe('HoldingListStore class filter', () => {
  let store: HoldingListStore;
  let httpTesting: HttpTestingController;

  const open = async (queryParams: Record<string, string> = {}, data: HoldingResponse[] = holdings): Promise<void> => {
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
    httpTesting.expectOne('/api/accounts').flush(accounts);
    await TestBed.inject(ApplicationRef).whenStable();
  };

  afterEach(() => httpTesting.verify());

  it('should start unfiltered', async () => {
    await open();

    expect(store.assetClass()).toBeNull();
    expect(store.classSummary()).toBeNull();
    expect(store.groups().every((group) => group.filtered === null)).toBe(true);
  });

  it.each([
    ['etf', 'ETF'],
    ['fonds', 'FUND'],
    ['actions', 'EQUITY'],
    ['crypto', 'CRYPTO'],
    ['liquidites', 'CASH'],
  ])('should open on the class of ?classe=%s', async (slug, assetClass) => {
    await open({ classe: slug });

    expect(store.assetClass()).toBe(assetClass);
  });

  it.each(['ETF', 'nonsense', 'constructor', ''])('should ignore the unknown class %j', async (slug) => {
    await open({ classe: slug });

    expect(store.assetClass()).toBeNull();
  });

  it('should count every row shown for Toutes, cash rows and savings balances included', async () => {
    await open();

    expect(store.classCounts().total).toBe(9);
  });

  it('should count the lines of each class and the cash rows with the savings balances as liquidities', async () => {
    await open();

    expect(store.classCounts().byClass).toEqual({ ETF: 2, FUND: 1, EQUITY: 1, CRYPTO: 1, BOND: 0, OTHER: 0, CASH: 4 });
  });

  it('should keep the counts when a search or a class narrows the list', async () => {
    await open({ classe: 'etf' });
    store.search.set('Amundi');

    expect(store.classCounts().total).toBe(9);
  });

  it('should keep the accounts that hold the class and drop the others', async () => {
    await open({ classe: 'etf' });

    expect(store.groups().map((group) => group.accountName)).toEqual(['Northwind PEA']);
    expect(store.groups()[0]!.holdings.map((holding) => holding.id)).toEqual(['h1', 'h2']);
  });

  it('should total each group on the class and keep the account total beside it', async () => {
    await open({ classe: 'etf' });
    const [group] = store.groups();

    expect(group!.valueEur).toBe(4000);
    expect(group!.filtered).toEqual({ accountValueEur: 4750, rowCount: 2 });
  });

  it('should hide the cash row unless the class is liquidities', async () => {
    await open({ classe: 'etf' });

    expect(store.groups()[0]!.showCash).toBe(false);
  });

  it('should show cash rows and savings balances under liquidities and count them', async () => {
    await open({ classe: 'liquidites' });

    expect(store.groups().map((group) => [group.accountName, group.valueEur, group.filtered?.rowCount])).toEqual([
      ['Northwind PEA', 250, 1],
      ['Woodgrove Savings Plan', 50, 1],
      ['Livret A', 710, 2],
    ]);
  });

  it('should summarise the class: total, share of the valued wealth and number of accounts', async () => {
    await open({ classe: 'etf' });

    expect(store.classSummary()).toEqual({ valueEur: 4000, share: 4000 / 7510, accounts: 1 });
  });

  it('should follow the search in the group totals and the summary', async () => {
    await open({ classe: 'etf' });
    store.search.set('s&p');

    expect(store.groups()[0]!.valueEur).toBe(3000);
    expect(store.groups()[0]!.filtered).toEqual({ accountValueEur: 4750, rowCount: 1 });
    expect(store.classSummary()!.valueEur).toBe(3000);
  });

  it('should find nothing for liquidities when searching, since cash never matches', async () => {
    await open({ classe: 'liquidites' });
    store.search.set('livret');

    expect(store.groups()).toEqual([]);
    expect(store.classSummary()).toEqual({ valueEur: 0, share: 0, accounts: 0 });
  });

  it('should leave the account totals alone when only a search is active', async () => {
    await open();
    store.search.set('Amundi');

    expect(store.groups()[0]!.valueEur).toBe(4750);
    expect(store.groups()[0]!.filtered).toBeNull();
  });

  it('should switch class and come back to every account', async () => {
    await open({ classe: 'crypto' });
    store.assetClass.set('FUND');

    expect(store.groups().map((group) => group.accountName)).toEqual(['Woodgrove Savings Plan']);

    store.assetClass.set(null);

    expect(store.groups()).toHaveLength(3);
  });

  it('should total an unvalued line as zero in its class', async () => {
    await open({ classe: 'actions' });

    expect(store.groups()[0]!.valueEur).toBe(0);
    expect(store.classSummary()).toEqual({ valueEur: 0, share: 0, accounts: 1 });
  });

  it('should still count the balance row of a savings account that has none set', async () => {
    await open(
      {},
      holdings.filter((holding) => holding.id !== 'cash-a3'),
    );

    expect(store.classCounts().total).toBe(9);
    expect(store.classCounts().byClass.CASH).toBe(4);
  });

  it('should give a share of zero when nothing is valued', async () => {
    await open({ classe: 'etf' }, []);

    expect(store.classSummary()).toEqual({ valueEur: 0, share: 0, accounts: 0 });
  });

  it('should expose the account to land on, whether or not it exists', async () => {
    await open({ compte: 'a2' });

    expect(store.accountParam()).toBe('a2');
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { of } from 'rxjs';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { HoldingChanges } from '../holding-changes';
import { HoldingListStore } from './holding-list-store';

const holdings = [
  {
    id: 'h1',
    accountId: 'a1',
    accountName: 'Northwind PEA',
    accountType: 'PEA',
    instrumentName: 'BNP Paribas Easy S&P 500',
    marketValueEur: 22515.47,
    unrealizedGainEur: 4497.36,
    stale: false,
  },
  {
    id: 'h2',
    accountId: 'a1',
    accountName: 'Northwind PEA',
    accountType: 'PEA',
    instrumentName: 'Amundi MSCI World Swap',
    marketValueEur: 19903,
    unrealizedGainEur: 3674.3,
    stale: false,
  },
  {
    id: 'h3',
    accountId: 'a2',
    accountName: 'Woodgrove Savings Plan',
    accountType: 'PEE',
    instrumentName: 'FCPE Actions',
    marketValueEur: 60926,
    unrealizedGainEur: null,
    stale: true,
  },
  {
    id: 'h4',
    accountId: 'a1',
    accountName: 'Northwind PEA',
    accountType: 'PEA',
    instrumentName: 'Newly listed fund',
    symbol: 'NLF',
    marketValueEur: null,
    unrealizedGainEur: 0,
    stale: false,
  },
  {
    id: 'h5',
    accountId: 'a1',
    accountName: 'Northwind PEA',
    accountType: 'PEA',
    instrumentName: 'Euros',
    accountCash: true,
    assetClass: 'CASH',
    priceSource: 'MANUAL',
    priceCurrency: 'EUR',
    quantity: 732.4,
    marketValueEur: 732.4,
    unrealizedGainEur: 0,
    stale: false,
  },
  {
    id: 'h6',
    accountId: 'a3',
    accountName: 'Livret A',
    accountType: 'SAVINGS',
    instrumentName: 'Euros',
    accountCash: true,
    assetClass: 'CASH',
    priceSource: 'MANUAL',
    priceCurrency: 'EUR',
    quantity: 20000,
    marketValueEur: 20000,
    unrealizedGainEur: 0,
    stale: false,
  },
] as unknown as HoldingResponse[];

const accounts = [
  { id: 'a1', name: 'Northwind PEA', type: 'PEA', institution: 'Northwind Bank' },
  { id: 'a2', name: 'Woodgrove Savings Plan', type: 'PEE', institution: 'Woodgrove Bank' },
  { id: 'a3', name: 'Livret A', type: 'SAVINGS', institution: 'Woodgrove Bank' },
];

describe('HoldingListStore', () => {
  let store: HoldingListStore;
  let httpTesting: HttpTestingController;

  const load = async (): Promise<void> => {
    TestBed.tick();
    httpTesting.expectOne('/api/holdings').flush(holdings);
    httpTesting.expectOne('/api/accounts').flush(accounts);
    await TestBed.inject(ApplicationRef).whenStable();
  };

  const configure = (queryParams: Record<string, string> = {}): void => {
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
  };

  beforeEach(() => configure());

  afterEach(() => httpTesting.verify());

  it('should group holdings by account in the order of the accounts list', async () => {
    await load();

    expect(store.groups().map((group) => group.accountName)).toEqual([
      'Northwind PEA',
      'Woodgrove Savings Plan',
      'Livret A',
    ]);
  });

  it('should subtotal each account', async () => {
    await load();

    expect(store.groups()[0]!.valueEur).toBeCloseTo(43150.87, 2);
    expect(store.groups()[1]!.valueEur).toBe(60926);
  });

  it('should filter on the instrument name, case-insensitively', async () => {
    await load();

    store.search.set('AMUNDI');
    expect(store.groups()).toHaveLength(1);
    expect(store.groups()[0]!.holdings).toHaveLength(1);
  });

  it('should filter on the symbol', async () => {
    await load();

    store.search.set('nlf');

    expect(store.groups().flatMap((group) => group.holdings.map((holding) => holding.id))).toEqual(['h4']);
  });

  it('should not match on the account name of an ordinary holding', async () => {
    await load();

    store.search.set('woodgrove');

    expect(store.groups().flatMap((group) => group.holdings)).toHaveLength(0);
  });

  it('should render a cash-only account with zero lines and its cash row', async () => {
    await load();

    const livretA = store.groups().find((group) => group.accountName === 'Livret A');

    expect(livretA).toBeDefined();
    expect(livretA?.holdings).toHaveLength(0);
    expect(livretA?.cashEur).toBe(20000);
    expect(livretA?.valueEur).toBe(20000);
  });

  it('should drop an account with no matching line while searching', async () => {
    await load();

    store.search.set('woodgrove');

    expect(store.groups()).toEqual([]);
  });

  it('should hide the cash line while searching and keep the account total', async () => {
    await load();

    store.search.set('amundi');

    expect(store.groups()).toHaveLength(1);
    expect(store.groups()[0]!.showCash).toBe(false);
    expect(store.groups()[0]!.valueEur).toBeCloseTo(43150.87, 2);
    expect(store.groups()[0]!.lineCount).toBe(3);
    expect(store.groups()[0]!.holdings).toHaveLength(1);
  });

  it('should exclude the EUR cash line from the positions and its lineCount', async () => {
    await load();

    const northwind = store.groups().find((group) => group.accountName === 'Northwind PEA');

    expect(northwind?.holdings.some((holding) => holding.instrumentName === 'Euros')).toBe(false);
    expect(northwind?.holdings).toHaveLength(3);
    expect(northwind?.lineCount).toBe(3);
  });

  it('should include the cash balance in the account subtotal', async () => {
    await load();

    const northwind = store.groups().find((group) => group.accountName === 'Northwind PEA');

    expect(northwind?.cashEur).toBe(732.4);
    expect(northwind?.valueEur).toBeCloseTo(43150.87, 2);
  });

  it('should default the cash balance to zero for an account with no cash line', async () => {
    await load();

    const woodgrove = store.groups().find((group) => group.accountName === 'Woodgrove Savings Plan');

    expect(woodgrove?.cashEur).toBe(0);
  });

  it('should default a cash-only account institution to blank when it is missing from the accounts list', async () => {
    TestBed.tick();
    httpTesting.expectOne('/api/holdings').flush(holdings);
    httpTesting.expectOne('/api/accounts').flush(accounts.filter((account) => account.id !== 'a3'));
    await TestBed.inject(ApplicationRef).whenStable();

    const livretA = store.groups().find((group) => group.accountName === 'Livret A');

    expect(livretA?.institution).toBe('');
  });

  it('should show the cash line of an account that has none, at zero', async () => {
    await load();

    const woodgrove = store.groups().find((group) => group.accountName === 'Woodgrove Savings Plan');

    expect(woodgrove?.showCash).toBe(true);
    expect(woodgrove?.cashEur).toBe(0);
  });

  it('should leave unvalued lines out of the account subtotal', async () => {
    await load();

    const northwind = store.groups().find((group) => group.accountName === 'Northwind PEA');

    expect(northwind?.valueEur).toBeCloseTo(43150.87, 2);
  });

  it('should count the lines a group leaves out, apart by reason', async () => {
    TestBed.tick();
    httpTesting.expectOne('/api/holdings').flush([
      ...holdings,
      {
        id: 'h9',
        accountId: 'a1',
        accountName: 'Northwind PEA',
        accountType: 'PEA',
        instrumentName: 'US fund',
        priceCurrency: 'USD',
        stale: false,
      },
    ]);
    httpTesting.expectOne('/api/accounts').flush(accounts);
    await TestBed.inject(ApplicationRef).whenStable();

    const northwind = store.groups().find((group) => group.accountName === 'Northwind PEA');
    const woodgrove = store.groups().find((group) => group.accountName === 'Woodgrove Savings Plan');

    expect(northwind).toMatchObject({ unvaluedCount: 1, nonEurCount: 1 });
    expect(woodgrove).toMatchObject({ unvaluedCount: 0, nonEurCount: 0 });
  });

  it('should not reload on its own once loaded', async () => {
    await load();
    TestBed.tick();

    httpTesting.expectNone('/api/holdings');
  });

  it('should reload the holdings when one is touched, keeping the groups meanwhile', async () => {
    await load();

    TestBed.inject(HoldingChanges).touched('h1');
    TestBed.tick();

    expect(store.holdings.status()).toBe('reloading');
    expect(store.groups()).toHaveLength(3);
    httpTesting.expectOne('/api/holdings').flush(holdings.slice(0, 2));
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.groups()).toHaveLength(2);
  });

  it('should reload the holdings when one is removed', async () => {
    await load();

    TestBed.inject(HoldingChanges).removed('h1');
    TestBed.tick();

    httpTesting.expectOne('/api/holdings').flush(holdings);
  });

  it('should hold empty groups while loading', () => {
    expect(store.groups()).toEqual([]);
  });

  it('should ignore accents in the search', async () => {
    const accented = [...holdings, { ...holdings[0]!, id: 'h7', instrumentName: 'Société Générale' }];
    TestBed.tick();
    httpTesting.expectOne('/api/holdings').flush(accented);
    httpTesting.expectOne('/api/accounts').flush(accounts);
    await TestBed.inject(ApplicationRef).whenStable();

    store.search.set('societe');

    expect(
      store
        .groups()
        .flatMap((group) => group.holdings)
        .some((holding) => holding.id === 'h7'),
    ).toBe(true);
  });

  it('should carry the account institution onto each group', async () => {
    await load();

    const northwind = store.groups().find((group) => group.accountName === 'Northwind PEA');

    expect(northwind?.institution).toBe('Northwind Bank');
  });

  it('should expose the add query param', async () => {
    configure({ add: 'a1' });
    await load();

    expect(store.addParam()).toBe('a1');
  });

  it('should ignore filter params it no longer knows', async () => {
    configure({ filter: 'stale', account: 'Woodgrove Savings Plan', assetClass: 'ETF' });
    await load();

    expect(store.groups().map((group) => group.accountName)).toEqual([
      'Northwind PEA',
      'Woodgrove Savings Plan',
      'Livret A',
    ]);
  });

  it('should not find a savings balance by the name of its account', async () => {
    const balance = {
      ...holdings[0]!,
      id: 'h8',
      accountId: 'a3',
      accountName: 'Livret A',
      accountType: 'SAVINGS',
      assetClass: 'CASH',
      instrumentName: 'Livret A',
    };
    TestBed.tick();
    httpTesting.expectOne('/api/holdings').flush([balance]);
    httpTesting.expectOne('/api/accounts').flush(accounts);
    await TestBed.inject(ApplicationRef).whenStable();

    store.search.set('livret');

    expect(store.groups()).toEqual([]);
  });

  it('should have no add param when the query carries none', async () => {
    await load();

    expect(store.addParam()).toBeNull();
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { of } from 'rxjs';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { HoldingListStore } from './holding-list-store';

const holdings = [
  {
    id: 'h1',
    accountId: 'a1',
    accountName: 'Saxo Investor',
    accountType: 'PEA',
    instrumentName: 'BNP Paribas Easy S&P 500',
    marketValueEur: 22515.47,
    unrealizedGainEur: 4497.36,
    stale: false,
  },
  {
    id: 'h2',
    accountId: 'a1',
    accountName: 'Saxo Investor',
    accountType: 'PEA',
    instrumentName: 'Amundi MSCI World Swap',
    marketValueEur: 19903,
    unrealizedGainEur: 3674.3,
    stale: false,
  },
  {
    id: 'h3',
    accountId: 'a2',
    accountName: 'Esalia',
    accountType: 'PEE',
    instrumentName: 'FCPE Actions',
    marketValueEur: 119258,
    unrealizedGainEur: null,
    stale: true,
  },
  {
    id: 'h4',
    accountId: 'a1',
    accountName: 'Saxo Investor',
    accountType: 'PEA',
    instrumentName: 'Newly listed fund',
    marketValueEur: null,
    unrealizedGainEur: 0,
    stale: false,
  },
  {
    id: 'h5',
    accountId: 'a1',
    accountName: 'Saxo Investor',
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
  { id: 'a1', name: 'Saxo Investor', type: 'PEA', institution: 'Saxo' },
  { id: 'a2', name: 'Esalia', type: 'PEE', institution: 'Amundi ESR' },
  { id: 'a3', name: 'Livret A', type: 'SAVINGS', institution: 'Fortuneo' },
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

    expect(store.groups().map((group) => group.accountName)).toEqual(['Saxo Investor', 'Esalia', 'Livret A']);
  });

  it('should subtotal each account', async () => {
    await load();

    expect(store.groups()[0]!.valueEur).toBeCloseTo(43150.87, 2);
    expect(store.groups()[1]!.valueEur).toBe(119258);
  });

  it('should filter on the instrument name, case-insensitively', async () => {
    await load();

    store.search.set('AMUNDI');
    expect(store.groups()).toHaveLength(1);
    expect(store.groups()[0]!.holdings).toHaveLength(1);
  });

  it('should not match on the account name of an ordinary holding', async () => {
    await load();

    store.search.set('esalia');

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

    store.search.set('esalia');

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

    const saxo = store.groups().find((group) => group.accountName === 'Saxo Investor');

    expect(saxo?.holdings.some((holding) => holding.instrumentName === 'Euros')).toBe(false);
    expect(saxo?.holdings).toHaveLength(3);
    expect(saxo?.lineCount).toBe(3);
  });

  it('should include the cash balance in the account subtotal', async () => {
    await load();

    const saxo = store.groups().find((group) => group.accountName === 'Saxo Investor');

    expect(saxo?.cashEur).toBe(732.4);
    expect(saxo?.valueEur).toBeCloseTo(43150.87, 2);
  });

  it('should default the cash balance to zero for an account with no cash line', async () => {
    await load();

    const esalia = store.groups().find((group) => group.accountName === 'Esalia');

    expect(esalia?.cashEur).toBe(0);
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

    const esalia = store.groups().find((group) => group.accountName === 'Esalia');

    expect(esalia?.showCash).toBe(true);
    expect(esalia?.cashEur).toBe(0);
  });

  it('should not show a cash line for a savings account without a cash balance', async () => {
    const booklet = {
      ...holdings[0]!,
      id: 'h8',
      accountId: 'a4',
      accountName: 'Fortuneo',
      accountType: 'SAVINGS',
      assetClass: 'CASH',
      instrumentName: 'Livret A',
    };
    TestBed.tick();
    httpTesting.expectOne('/api/holdings').flush([booklet]);
    httpTesting
      .expectOne('/api/accounts')
      .flush([...accounts, { id: 'a4', name: 'Fortuneo', type: 'SAVINGS', institution: 'Fortuneo' }]);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.groups()[0]!.showCash).toBe(false);
    expect(store.groups()[0]!.bookletCount).toBe(1);
    expect(store.groups()[0]!.lineCount).toBe(0);
  });

  it('should leave unvalued lines out of the account subtotal', async () => {
    await load();

    const saxo = store.groups().find((group) => group.accountName === 'Saxo Investor');

    expect(saxo?.valueEur).toBeCloseTo(43150.87, 2);
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

    const saxo = store.groups().find((group) => group.accountName === 'Saxo Investor');

    expect(saxo?.institution).toBe('Saxo');
  });

  it('should expose the add query param', async () => {
    configure({ add: 'a1' });
    await load();

    expect(store.addParam()).toBe('a1');
  });

  it('should ignore filter params it no longer knows', async () => {
    configure({ filter: 'stale', account: 'Esalia', assetClass: 'ETF' });
    await load();

    expect(store.groups().map((group) => group.accountName)).toEqual(['Saxo Investor', 'Esalia', 'Livret A']);
  });

  it('should not find a savings booklet by its name', async () => {
    const booklet = {
      ...holdings[0]!,
      id: 'h8',
      accountId: 'a3',
      accountName: 'Livret A',
      accountType: 'SAVINGS',
      assetClass: 'CASH',
      instrumentName: 'Livret A',
    };
    TestBed.tick();
    httpTesting.expectOne('/api/holdings').flush([booklet]);
    httpTesting.expectOne('/api/accounts').flush(accounts);
    await TestBed.inject(ApplicationRef).whenStable();

    store.search.set('livret');

    expect(store.groups()).toEqual([]);
  });

  it('should read the add param and nothing else from the query', async () => {
    await load();

    expect(store.addParam()).toBeNull();
  });
});

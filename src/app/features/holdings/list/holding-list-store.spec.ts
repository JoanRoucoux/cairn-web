import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

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
    assetClass: 'CASH',
    priceSource: 'MANUAL',
    priceCurrency: 'EUR',
    quantity: 20000,
    marketValueEur: 20000,
    unrealizedGainEur: 0,
    stale: false,
  },
] as unknown as HoldingResponse[];

describe('HoldingListStore', () => {
  let store: HoldingListStore;
  let httpTesting: HttpTestingController;

  const load = async (): Promise<void> => {
    TestBed.tick();
    httpTesting.expectOne('/api/holdings').flush(holdings);
    await TestBed.inject(ApplicationRef).whenStable();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), HoldingListStore],
    });
    store = TestBed.inject(HoldingListStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should group holdings by account', async () => {
    await load();

    expect(store.groups().map((group) => group.accountName)).toEqual(['Esalia', 'Saxo Investor', 'Livret A']);
  });

  it('should order groups by value, largest first', async () => {
    await load();

    expect(store.groups()[0]!.valueEur).toBe(119258);
  });

  it('should subtotal each account', async () => {
    await load();

    expect(store.groups()[1]!.valueEur).toBeCloseTo(43150.87, 2);
  });

  it('should leave an account subtotal unknown when any line has no cost basis', async () => {
    await load();

    expect(store.groups()[0]!.unrealizedGainEur).toBeNull();
    expect(store.groups()[1]!.unrealizedGainEur).toBeCloseTo(8171.66, 2);
  });

  it('should mark an account stale when any of its lines is', async () => {
    await load();

    expect(store.groups()[0]!.stale).toBe(true);
    expect(store.groups()[1]!.stale).toBe(false);
  });

  it('should filter on instrument and account name, case-insensitively', async () => {
    await load();

    store.search.set('AMUNDI');
    expect(store.groups()).toHaveLength(1);
    expect(store.groups()[0]!.holdings).toHaveLength(1);

    store.search.set('esalia');
    expect(store.groups()[0]!.accountName).toBe('Esalia');
  });

  it('should count lines and accounts', async () => {
    await load();

    expect(store.totals()).toEqual({ lines: 4, accounts: 3, valueEur: 182408.87, unvaluedCount: 1 });
  });

  it('should render a cash-only account with zero lines and its cash row', async () => {
    await load();

    const livretA = store.groups().find((group) => group.accountName === 'Livret A');

    expect(livretA).toBeDefined();
    expect(livretA?.holdings).toHaveLength(0);
    expect(livretA?.cashEur).toBe(20000);
    expect(livretA?.valueEur).toBe(20000);
  });

  it('should show a cash-only account with an empty search', async () => {
    await load();

    expect(store.groups().some((group) => group.accountName === 'Livret A')).toBe(true);
  });

  it('should hide a cash-only account whose name does not match the search', async () => {
    await load();

    store.search.set('esalia');

    expect(store.groups().some((group) => group.accountName === 'Livret A')).toBe(false);
  });

  it('should show a cash-only account whose name matches the search', async () => {
    await load();

    store.search.set('livret');

    expect(store.groups()).toHaveLength(1);
    expect(store.groups()[0]!.accountName).toBe('Livret A');
    expect(store.groups()[0]!.cashEur).toBe(20000);
  });

  it('should exclude the EUR cash line from the positions and its lineCount', async () => {
    await load();

    const saxo = store.groups().find((group) => group.accountName === 'Saxo Investor');

    expect(saxo?.holdings.some((holding) => holding.instrumentName === 'Euros')).toBe(false);
    expect(saxo?.holdings).toHaveLength(3);
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

  it('should keep the cash balance in a visible group even when the search hides every position', async () => {
    await load();

    store.search.set('amundi');

    expect(store.groups()).toHaveLength(1);
    expect(store.groups()[0]!.cashEur).toBe(732.4);
  });

  it('should count unvalued lines per account without folding them into the subtotal', async () => {
    await load();

    const saxo = store.groups().find((group) => group.accountName === 'Saxo Investor');

    expect(saxo?.unvaluedCount).toBe(1);
    expect(saxo?.valueEur).toBeCloseTo(43150.87, 2);
  });

  it('should hold empty groups while loading', () => {
    expect(store.groups()).toEqual([]);
  });
});

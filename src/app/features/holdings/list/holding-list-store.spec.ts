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

    expect(store.groups().map((group) => group.accountName)).toEqual(['Esalia', 'Saxo Investor']);
  });

  it('should order groups by value, largest first', async () => {
    await load();

    expect(store.groups()[0]!.valueEur).toBe(119258);
  });

  it('should subtotal each account', async () => {
    await load();

    expect(store.groups()[1]!.valueEur).toBeCloseTo(42418.47, 2);
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

    expect(store.totals()).toEqual({ lines: 4, accounts: 2, valueEur: 161676.47, unvaluedCount: 1 });
  });

  it('should count unvalued lines per account without folding them into the subtotal', async () => {
    await load();

    const saxo = store.groups().find((group) => group.accountName === 'Saxo Investor');

    expect(saxo?.unvaluedCount).toBe(1);
    expect(saxo?.valueEur).toBeCloseTo(42418.47, 2);
  });

  it('should hold empty groups while loading', () => {
    expect(store.groups()).toEqual([]);
  });
});

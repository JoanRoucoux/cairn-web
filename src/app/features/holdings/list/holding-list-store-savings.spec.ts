import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { of } from 'rxjs';

import { HoldingChanges } from '../holding-changes';
import { HoldingListStore } from './holding-list-store';

const northwindLine = {
  id: 'h1',
  accountId: 'a1',
  accountName: 'Northwind PEA',
  accountType: 'PEA',
  marketValueEur: 100,
};
const livretCash = {
  id: 'h2',
  accountId: 'a3',
  accountName: 'Livret A',
  accountType: 'SAVINGS',
  accountCash: true,
  assetClass: 'CASH',
  quantity: 20000,
  marketValueEur: 20000,
  updatedAt: '2026-09-12T08:00:00Z',
};

const accounts = [
  { id: 'a1', name: 'Northwind PEA', type: 'PEA', institution: 'Northwind Bank' },
  { id: 'a3', name: 'Livret A', type: 'SAVINGS', institution: 'Woodgrove Bank' },
];

describe('HoldingListStore savings accounts', () => {
  let store: HoldingListStore;
  let httpTesting: HttpTestingController;

  const load = async (holdings: unknown[], queryParams: Record<string, string> = {}): Promise<void> => {
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
    httpTesting.expectOne('/api/holdings').flush(holdings);
    httpTesting.expectOne('/api/accounts').flush(accounts);
    await TestBed.inject(ApplicationRef).whenStable();
  };

  afterEach(() => httpTesting.verify());

  it('should carry the date of the balance on the group of an account with a cash line', async () => {
    await load([livretCash, northwindLine]);

    const livretA = store.groups().find((group) => group.accountName === 'Livret A');

    expect(livretA?.balanceAt).toBe('2026-09-12T08:00:00Z');
    expect(livretA?.showCash).toBe(true);
  });

  it('should show a savings account with no holding at all as a balance of zero, with no date', async () => {
    await load([northwindLine]);

    const livretA = store.groups().find((group) => group.accountName === 'Livret A');

    expect(livretA).toMatchObject({
      showCash: true,
      cashEur: 0,
      valueEur: 0,
      balanceAt: null,
      institution: 'Woodgrove Bank',
    });
    expect(store.groups().map((group) => group.accountName)).toEqual(['Northwind PEA', 'Livret A']);
  });

  it('should keep a securities account with no holding out of the list', async () => {
    await load([]);

    expect(store.groups().map((group) => group.accountName)).toEqual(['Livret A']);
  });

  it('should expose the balance query param', async () => {
    await load([], { balance: 'a3' });

    expect(store.balanceParam()).toBe('a3');
  });
});

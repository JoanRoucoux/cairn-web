import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { of } from 'rxjs';

import { HoldingChanges } from '../holding-changes';
import { HoldingListStore } from './holding-list-store';

const holdings = [
  {
    id: 'h1',
    accountId: 'a1',
    accountName: 'Northwind PEA',
    accountType: 'PEA',
    instrumentName: 'Amundi',
    assetClass: 'ETF',
    marketValueEur: 1,
  },
  {
    id: 'h2',
    accountId: 'a2',
    accountName: 'Woodgrove Savings Plan',
    accountType: 'PEE',
    instrumentName: 'FCPE',
    assetClass: 'FUND',
    marketValueEur: 2,
  },
];

const accounts = [
  { id: 'a1', name: 'Northwind PEA', type: 'PEA', institution: 'Northwind Bank' },
  { id: 'a2', name: 'Woodgrove Savings Plan', type: 'PEE', institution: 'Woodgrove Bank' },
];

describe('HoldingListStore after a change', () => {
  let store: HoldingListStore;
  let httpTesting: HttpTestingController;

  const load = async (): Promise<void> => {
    TestBed.tick();
    httpTesting.expectOne('/api/holdings').flush(holdings);
    httpTesting.expectOne('/api/accounts').flush(accounts);
    await TestBed.inject(ApplicationRef).whenStable();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        HoldingChanges,
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})) } },
        HoldingListStore,
      ],
    });
    store = TestBed.inject(HoldingListStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  const touchAndReveal = (id: string): void => {
    const changes = TestBed.inject(HoldingChanges);

    changes.reveal(changes.touched(id));
  };

  it('should wait for the dialog to reveal the change before naming it, even once the reload has landed', async () => {
    await load();
    const changes = TestBed.inject(HoldingChanges);

    const change = changes.touched('h1');
    TestBed.tick();
    httpTesting.expectOne('/api/holdings').flush(holdings);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.flash()).toBeNull();

    changes.reveal(change);
    TestBed.tick();

    expect(store.flash()).toBe(change);
  });

  it('should name the touched holding once its reload has landed, not before', async () => {
    await load();

    touchAndReveal('h1');
    TestBed.tick();

    expect(store.flash()).toBeNull();
    httpTesting.expectOne('/api/holdings').flush(holdings);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.flash()).toEqual(TestBed.inject(HoldingChanges).lastTouched());
  });

  it('should name nothing after a removal', async () => {
    await load();

    TestBed.inject(HoldingChanges).removed('h1');
    TestBed.tick();
    httpTesting.expectOne('/api/holdings').flush(holdings);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.flash()).toBeNull();
  });

  it('should not name a holding touched before the list opened', async () => {
    touchAndReveal('h1');
    await load();

    expect(store.flash()).toBeNull();
  });

  it('should drop the change when its reload fails, so a later Retry does not replay the highlight', async () => {
    await load();

    touchAndReveal('h1');
    TestBed.tick();
    httpTesting.expectOne('/api/holdings').flush(null, { status: 500, statusText: 'Server Error' });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.flash()).toBeNull();

    store.holdings.reload();
    TestBed.tick();
    httpTesting.expectOne('/api/holdings').flush(holdings);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.flash()).toBeNull();
  });

  it('should forget a played change once a later reload fails, so Retry does not replay its highlight', async () => {
    await load();

    touchAndReveal('h1');
    TestBed.tick();
    httpTesting.expectOne('/api/holdings').flush(holdings);
    await TestBed.inject(ApplicationRef).whenStable();
    expect(store.flash()?.id).toBe('h1');

    TestBed.inject(HoldingChanges).removed('h2');
    TestBed.tick();
    httpTesting.expectOne('/api/holdings').flush(null, { status: 500, statusText: 'Server Error' });
    await TestBed.inject(ApplicationRef).whenStable();

    store.holdings.reload();
    TestBed.tick();
    httpTesting.expectOne('/api/holdings').flush(holdings);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.flash()).toBeNull();
  });

  it('should key each group by its account and the filter, so a filter rebuilds the groups and a reload does not', async () => {
    await load();
    const keys = store.groups().map((group) => group.key);

    touchAndReveal('h1');
    TestBed.tick();
    httpTesting.expectOne('/api/holdings').flush(holdings);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.groups().map((group) => group.key)).toEqual(keys);

    store.search.set('fcpe');

    expect(store.groups().map((group) => group.key)).toEqual(['a2|fcpe||']);

    store.search.set('');
    store.assetClass.set('ETF');

    expect(store.groups().map((group) => group.key)).toEqual(['a1||ETF|']);
  });

  it('should forget the named holding once the search or the class changes', async () => {
    await load();
    touchAndReveal('h1');
    TestBed.tick();
    httpTesting.expectOne('/api/holdings').flush(holdings);
    await TestBed.inject(ApplicationRef).whenStable();
    const before = store.filterKey();

    store.search.set('amundi');

    expect(store.filterKey()).not.toBe(before);
    expect(store.flash()).toBeNull();

    store.search.set('');
    store.assetClass.set('ETF');

    expect(store.filterKey()).not.toBe(before);
    expect(store.flash()).toBeNull();
  });
});

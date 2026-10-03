import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AllocationStore } from './allocation-store';

describe('AllocationStore', () => {
  let store: AllocationStore;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), AllocationStore],
    });
    store = TestBed.inject(AllocationStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should expose each breakdown from its own endpoint', async () => {
    TestBed.tick();
    httpTesting.expectOne('/api/portfolio/allocation/classes').flush({
      totalEur: 91392,
      items: [{ assetClass: 'ETF', valueEur: 91392, share: 1, lineCount: 2 }],
    });
    httpTesting.expectOne('/api/portfolio/allocation/accounts').flush({ totalEur: 91392, items: [] });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.classes.value()?.items).toHaveLength(1);
    expect(store.accounts.value()?.items).toHaveLength(0);
  });

  it('should reload only the classes call on retryClasses', async () => {
    TestBed.tick();
    httpTesting.expectOne('/api/portfolio/allocation/classes').flush({ totalEur: 0, items: [] });
    httpTesting.expectOne('/api/portfolio/allocation/accounts').flush({ totalEur: 0, items: [] });
    await TestBed.inject(ApplicationRef).whenStable();

    store.retryClasses();

    await vi
      .waitFor(() => httpTesting.expectOne('/api/portfolio/allocation/classes'))
      .then((request) => request.flush({ totalEur: 0, items: [] }));
    httpTesting.expectNone('/api/portfolio/allocation/accounts');
  });

  it('should reload only the accounts call on retryAccounts', async () => {
    TestBed.tick();
    httpTesting.expectOne('/api/portfolio/allocation/classes').flush({ totalEur: 0, items: [] });
    httpTesting.expectOne('/api/portfolio/allocation/accounts').flush({ totalEur: 0, items: [] });
    await TestBed.inject(ApplicationRef).whenStable();

    store.retryAccounts();

    await vi
      .waitFor(() => httpTesting.expectOne('/api/portfolio/allocation/accounts'))
      .then((request) => request.flush({ totalEur: 0, items: [] }));
    httpTesting.expectNone('/api/portfolio/allocation/classes');
  });
});

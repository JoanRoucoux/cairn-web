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

  it('should expose the breakdowns and the accounts returned by the API', async () => {
    TestBed.tick();
    httpTesting.expectOne('/api/portfolio').flush({
      byAssetClass: [{ label: 'ETF', valueEur: 128656, share: 0.463 }],
      byAccount: [{ label: 'Esalia', valueEur: 119258, share: 0.429 }],
      holdings: [],
    });
    httpTesting.expectOne('/api/accounts').flush([{ id: 'a1', name: 'Esalia', type: 'PEE', institution: 'Amundi' }]);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.portfolio.value()?.byAssetClass).toHaveLength(1);
    expect(store.portfolio.value()?.byAccount).toHaveLength(1);
    expect(store.accounts.value()).toHaveLength(1);
  });

  it('should reload both calls on retry', async () => {
    TestBed.tick();
    httpTesting.expectOne('/api/portfolio').flush({ byAssetClass: [], byAccount: [], holdings: [] });
    httpTesting.expectOne('/api/accounts').flush([]);
    await TestBed.inject(ApplicationRef).whenStable();

    store.retry();

    await vi
      .waitFor(() => httpTesting.expectOne('/api/portfolio'))
      .then((request) => request.flush({ byAssetClass: [], byAccount: [], holdings: [] }));
    await vi.waitFor(() => httpTesting.expectOne('/api/accounts')).then((request) => request.flush([]));
  });
});

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

  it('should expose the breakdowns returned by the API', async () => {
    TestBed.tick();
    httpTesting.expectOne('/api/portfolio').flush({
      byAssetClass: [{ label: 'Funds', valueEur: 128656, share: 0.463 }],
      byAccount: [{ label: 'Esalia', valueEur: 119258, share: 0.429 }],
    });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.portfolio.value()?.byAssetClass).toHaveLength(1);
    expect(store.portfolio.value()?.byAccount).toHaveLength(1);
  });
});

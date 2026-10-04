import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { of } from 'rxjs';

import { HoldingChanges } from '../holding-changes';
import { HoldingDetailStore } from './holding-detail-store';

const holdings = [
  { id: 'h1', instrumentId: 'i1', instrumentName: 'BNP Paribas Easy S&P 500', quantity: 2, marketValueEur: 22515.47 },
  { id: 'h2', instrumentId: 'i2', instrumentName: 'Amundi MSCI World Swap', marketValueEur: 19903 },
];

describe('HoldingDetailStore after a change', () => {
  let store: HoldingDetailStore;
  let changes: HoldingChanges;
  let httpTesting: HttpTestingController;

  const settle = async (): Promise<void> => {
    for (let i = 0; i < 10; i++) {
      TestBed.tick();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  };

  const flushQuotes = (): void =>
    httpTesting.match((request) => request.url.includes('/quotes')).forEach((request) => request.flush([]));

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ holdingId: 'h1' })) } },
        HoldingChanges,
        HoldingDetailStore,
      ],
    });
    store = TestBed.inject(HoldingDetailStore);
    changes = TestBed.inject(HoldingChanges);
    httpTesting = TestBed.inject(HttpTestingController);
    TestBed.tick();
    httpTesting.expectOne('/api/holdings').flush(holdings);
    await settle();
    flushQuotes();
    await settle();
  });

  afterEach(() => httpTesting.verify());

  it('should name the change of the open line once reloaded and revealed by its dialog', async () => {
    const change = changes.touched('h1');
    await settle();
    httpTesting.expectOne('/api/holdings').flush(holdings);
    flushQuotes();
    await settle();

    expect(store.flash()).toBeNull();

    changes.reveal(change);
    await settle();

    expect(store.flash()).toBe(change);
  });

  it('should name nothing for a change of another line', async () => {
    const change = changes.touched('h2');
    await settle();
    httpTesting.expectOne('/api/holdings').flush(holdings);
    flushQuotes();
    changes.reveal(change);
    await settle();

    expect(store.flash()).toBeNull();
  });

  it('should drop the change when its reload fails', async () => {
    const change = changes.touched('h1');
    await settle();
    httpTesting.expectOne('/api/holdings').flush(null, { status: 500, statusText: 'Server Error' });
    flushQuotes();
    changes.reveal(change);
    await settle();

    expect(store.flash()).toBeNull();
  });
});

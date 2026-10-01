import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { HoldingAddDialogStore } from './holding-add-dialog-store';

const accounts = [{ id: 'a1', name: 'Saxo Investor', type: 'PEA', institution: 'Saxo' }];
const instruments = [
  { id: 'i1', name: 'Amundi MSCI World', isin: 'LU1681043599', assetClass: 'ETF', priceSource: 'YAHOO' },
];

describe('HoldingAddDialogStore search and probe', () => {
  let store: HoldingAddDialogStore;
  let httpTesting: HttpTestingController;

  const load = async (holdings: unknown[] = []): Promise<void> => {
    TestBed.tick();
    httpTesting.expectOne('/api/accounts').flush(accounts);
    httpTesting.expectOne('/api/instruments').flush(instruments);
    httpTesting.expectOne('/api/holdings').flush(holdings);
    await TestBed.inject(ApplicationRef).whenStable();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        HoldingAddDialogStore,
      ],
    });
    store = TestBed.inject(HoldingAddDialogStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('computes the latent gain at the probe price only with a positive average cost', async () => {
    await load();
    store.pickOnline({
      name: 'iShares Core MSCI World',
      source: 'YAHOO',
      sourceRef: 'IWDA.AS',
      assetClass: 'ETF',
      probePrice: 100,
    });
    store.quantityText.set('10');

    expect(store.gainAtProbe()).toBeNull();

    store.averageCostText.set('80');

    expect(store.gainAtProbe()).toBeCloseTo(200, 5);
  });

  it('counts the lines of each instrument from the holdings', async () => {
    await load([{ instrumentId: 'i1' }, { instrumentId: 'i1' }]);

    expect(store.lineCountOf('i1')).toBe(2);
    expect(store.lineCountOf('i2')).toBe(0);
  });

  it('does not search online below three characters', async () => {
    await load();
    vi.useFakeTimers();

    store.onQueryChange('ms');
    await vi.advanceTimersByTimeAsync(400);
    vi.useRealTimers();

    httpTesting.expectNone('/api/instruments/resolve');
  });
});

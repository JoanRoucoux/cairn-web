import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { HoldingAddDialogStore } from './holding-add-dialog-store';

const instruments = [
  {
    id: 'i1',
    name: 'Amundi MSCI World',
    isin: 'LU1681043599',
    currency: 'EUR',
    assetClass: 'ETF',
    priceSource: 'YAHOO',
  },
  {
    id: 'i2',
    name: 'Société Générale',
    isin: 'FR0000130809',
    currency: 'EUR',
    assetClass: 'EQUITY',
    priceSource: 'YAHOO',
  },
];

const accounts = [{ id: 'a1', name: 'Saxo Investor', type: 'PEA', institution: 'Saxo' }];

describe('HoldingAddDialogStore', () => {
  let store: HoldingAddDialogStore;
  let httpTesting: HttpTestingController;

  const load = async (): Promise<void> => {
    TestBed.tick();
    httpTesting.expectOne('/api/accounts').flush(accounts);
    httpTesting.expectOne('/api/instruments').flush(instruments);
    httpTesting.expectOne('/api/holdings').flush([]);
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

  it('filters the catalogue locally, ignoring accents and case', async () => {
    await load();

    store.onQueryChange('societe');
    expect(store.filteredCatalog().map((instrument) => instrument.id)).toEqual(['i2']);
  });

  it('matches an ISIN typed in lowercase', async () => {
    await load();

    store.onQueryChange('lu1681043599');
    expect(store.filteredCatalog().map((instrument) => instrument.id)).toEqual(['i1']);
  });

  it('leaves the catalogue empty for a blank query', async () => {
    await load();

    store.onQueryChange('');
    expect(store.filteredCatalog()).toEqual([]);
  });

  it('debounces the online search by 300ms', async () => {
    await load();

    vi.useFakeTimers();
    try {
      store.onQueryChange('msci world');
      expect(store.searchingOnline()).toBe(false);

      await vi.advanceTimersByTimeAsync(299);
      expect(store.searchingOnline()).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      expect(store.searchingOnline()).toBe(true);
    } finally {
      vi.useRealTimers();
    }

    httpTesting.expectOne('/api/instruments/resolve').flush([]);
    await vi.waitFor(() => expect(store.searchingOnline()).toBe(false));
  });

  it('resets the picked instrument and the previous results when the query changes', async () => {
    await load();

    store.pickCatalog(instruments[0] as never);
    store.onQueryChange('new query');

    expect(store.picked()).toBeUndefined();
    expect(store.candidates()).toEqual([]);
  });

  it('reports an online search failure without touching the catalogue results', async () => {
    await load();

    const search = store.searchOnline('msci');
    httpTesting.expectOne('/api/instruments/resolve').flush(null, { status: 500, statusText: 'Server error' });
    await search;

    expect(store.onlineError()).toBe(true);
    expect(store.onlineSearched()).toBe(true);
  });

  it('does nothing for a blank online search', async () => {
    await load();

    await store.searchOnline('');

    expect(store.searchingOnline()).toBe(false);
    httpTesting.expectNone('/api/instruments/resolve');
  });

  it('never saves without a pick, an account and a positive quantity', async () => {
    await load();

    await expect(store.save()).resolves.toBe(false);
    httpTesting.expectNone('/api/holdings');
  });

  it('is invalid without a picked instrument, an account or a positive quantity', async () => {
    await load();

    expect(store.valid()).toBe(false);

    store.accountId.set('a1');
    store.pickCatalog(instruments[0] as never);
    expect(store.valid()).toBe(false);

    store.quantityText.set('10');
    expect(store.valid()).toBe(true);
  });

  it('is invalid for a manual pick until an asset class is chosen, with no default', async () => {
    await load();
    store.accountId.set('a1');
    store.query.set('Unlisted Fund');
    store.pickManual();
    store.quantityText.set('5');

    expect(store.assetClass()).toBeUndefined();
    expect(store.valid()).toBe(false);

    store.assetClass.set('FUND');
    expect(store.valid()).toBe(true);
  });

  it('creates a holding directly for a catalogue pick', async () => {
    await load();
    store.accountId.set('a1');
    store.pickCatalog(instruments[0] as never);
    store.quantityText.set('10');

    const saved = store.save();

    const request = await vi.waitFor(() => httpTesting.expectOne('/api/holdings'));
    expect(request.request.body).toEqual({ accountId: 'a1', instrumentId: 'i1', quantity: 10, averageCost: null });
    request.flush({});

    await expect(saved).resolves.toBe(true);
  });

  it('creates the instrument then the holding for an online pick', async () => {
    await load();
    store.accountId.set('a1');
    store.query.set('IE00B4L5Y983');
    store.pickOnline({
      name: 'iShares Core MSCI World',
      source: 'YAHOO',
      sourceRef: 'IWDA.AS',
      assetClass: 'ETF',
      exchange: 'Euronext Amsterdam',
      probePrice: 97.91,
    });
    store.quantityText.set('10');

    const saved = store.save();

    const createInstrument = await vi.waitFor(() => httpTesting.expectOne('/api/instruments'));
    expect(createInstrument.request.body).toEqual({
      name: 'iShares Core MSCI World',
      isin: 'IE00B4L5Y983',
      currency: 'EUR',
      assetClass: 'ETF',
      priceSource: 'YAHOO',
      sourceRef: 'IWDA.AS',
      symbol: null,
    });
    createInstrument.flush({ id: 'i9' });

    const createHolding = await vi.waitFor(() => httpTesting.expectOne('/api/holdings'));
    expect(createHolding.request.body).toEqual({
      accountId: 'a1',
      instrumentId: 'i9',
      quantity: 10,
      averageCost: null,
    });
    createHolding.flush({});

    await expect(saved).resolves.toBe(true);
  });

  it('creates an online instrument with no ISIN when the title field was cleared', async () => {
    await load();
    store.accountId.set('a1');
    store.query.set('   ');
    store.pickOnline({
      name: 'iShares Core MSCI World',
      source: 'YAHOO',
      sourceRef: 'IWDA.AS',
      assetClass: 'ETF',
      exchange: 'Euronext Amsterdam',
      probePrice: 97.91,
    });
    store.quantityText.set('10');

    const saved = store.save();

    const createInstrument = await vi.waitFor(() => httpTesting.expectOne('/api/instruments'));
    expect(createInstrument.request.body).toMatchObject({ isin: null });
    createInstrument.flush({ id: 'i9' });
    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings'))).flush({});

    await expect(saved).resolves.toBe(true);
  });

  it('creates a manually priced instrument when nothing was found', async () => {
    await load();
    store.accountId.set('a1');
    store.query.set('Unlisted Fund');
    store.pickManual();
    store.assetClass.set('FUND');
    store.quantityText.set('5');

    const saved = store.save();

    const createInstrument = await vi.waitFor(() => httpTesting.expectOne('/api/instruments'));
    expect(createInstrument.request.body).toEqual({
      name: 'Unlisted Fund',
      isin: null,
      currency: 'EUR',
      assetClass: 'FUND',
      priceSource: 'MANUAL',
      sourceRef: null,
    });
    createInstrument.flush({ id: 'i10' });
    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings'))).flush({});

    await expect(saved).resolves.toBe(true);
  });

  it('retries only the holding when the instrument was already created', async () => {
    await load();
    store.accountId.set('a1');
    store.query.set('Unlisted Fund');
    store.pickManual();
    store.assetClass.set('FUND');
    store.quantityText.set('5');

    const firstAttempt = store.save();
    const createInstrument = await vi.waitFor(() => httpTesting.expectOne('/api/instruments'));
    createInstrument.flush({ id: 'i10' });
    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings'))).flush(null, {
      status: 500,
      statusText: 'Server error',
    });
    await expect(firstAttempt).resolves.toBe(false);

    const secondAttempt = store.save();
    httpTesting.expectNone('/api/instruments');
    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings'))).flush({});
    await expect(secondAttempt).resolves.toBe(true);
  });

  it('flags an instrument creation failure without ever calling the holding endpoint', async () => {
    await load();
    store.accountId.set('a1');
    store.query.set('Unlisted Fund');
    store.pickManual();
    store.assetClass.set('FUND');
    store.quantityText.set('5');

    const saved = store.save();
    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments'))).flush(null, {
      status: 500,
      statusText: 'Server error',
    });

    await expect(saved).resolves.toBe(false);
    expect(store.instrumentError()).toBe(true);
    httpTesting.expectNone('/api/holdings');
  });

  it('forgets the created instrument after being unpicked', async () => {
    await load();
    store.accountId.set('a1');
    store.query.set('Unlisted Fund');
    store.pickManual();
    store.assetClass.set('FUND');
    store.quantityText.set('5');

    const first = store.save();
    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments'))).flush({ id: 'i10' });
    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings'))).flush({});
    await first;

    store.unpick();
    store.pickManual();
    store.assetClass.set('FUND');

    const second = store.save();
    await vi.waitFor(() => httpTesting.expectOne('/api/instruments').flush({ id: 'i11' }));
    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings'))).flush({});
    await expect(second).resolves.toBe(true);
  });

  it('computes the value at the probe price', async () => {
    await load();
    store.pickOnline({
      name: 'iShares Core MSCI World',
      source: 'YAHOO',
      sourceRef: 'IWDA.AS',
      assetClass: 'ETF',
      exchange: 'Euronext Amsterdam',
      probePrice: 97.91,
    });
    store.quantityText.set('10');

    expect(store.valueAtProbe()).toBeCloseTo(979.1, 5);
  });

  it('has no probe value for a catalogue or manual pick', async () => {
    await load();
    store.pickCatalog(instruments[0] as never);
    store.quantityText.set('10');

    expect(store.probePrice()).toBeNull();
    expect(store.valueAtProbe()).toBeNull();
  });

  it('has no probe value when the source could not fetch a probe price', async () => {
    await load();
    store.pickOnline({
      name: 'iShares Core MSCI World',
      source: 'YAHOO',
      sourceRef: 'IWDA.AS',
      assetClass: 'ETF',
      exchange: 'Euronext Amsterdam',
      probePrice: null,
    });
    store.quantityText.set('10');

    expect(store.probePrice()).toBeNull();
  });

  it('filters an instrument with no ISIN on its name alone', async () => {
    TestBed.tick();
    httpTesting.expectOne('/api/accounts').flush(accounts);
    httpTesting
      .expectOne('/api/instruments')
      .flush([...instruments, { ...instruments[0], id: 'i9', name: 'Bitcoin', isin: null }]);
    httpTesting.expectOne('/api/holdings').flush([]);
    await TestBed.inject(ApplicationRef).whenStable();

    store.onQueryChange('bitcoin');

    expect(store.filteredCatalog().map((instrument) => instrument.id)).toEqual(['i9']);
  });

  it('filters an instrument with no ISIN on its symbol', async () => {
    TestBed.tick();
    httpTesting.expectOne('/api/accounts').flush(accounts);
    httpTesting
      .expectOne('/api/instruments')
      .flush([...instruments, { ...instruments[0], id: 'i9', name: 'Bitcoin', isin: null, symbol: 'BTC' }]);
    httpTesting.expectOne('/api/holdings').flush([]);
    await TestBed.inject(ApplicationRef).whenStable();

    store.onQueryChange('btc');

    expect(store.filteredCatalog().map((instrument) => instrument.id)).toEqual(['i9']);
  });
});

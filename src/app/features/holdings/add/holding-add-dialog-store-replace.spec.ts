import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { HoldingAddDialogStore } from './holding-add-dialog-store';

const instruments = [
  { id: 'i1', name: 'Amundi MSCI World', isin: 'LU1681043599', currency: 'EUR', assetClass: 'ETF' },
  { id: 'i2', name: 'iShares MSCI World USD', isin: 'IE00B4L5Y983', currency: 'USD', assetClass: 'ETF' },
];

const candidate = {
  name: 'iShares Core MSCI World',
  source: 'YAHOO',
  sourceRef: 'IWDA.AS',
  assetClass: 'ETF',
  exchange: 'Euronext Amsterdam',
  probePrice: 97.91,
  currency: 'EUR',
} as const;

describe('HoldingAddDialogStore replace mode', () => {
  let store: HoldingAddDialogStore;
  let httpTesting: HttpTestingController;

  const load = async (holdings: unknown[] = []): Promise<void> => {
    TestBed.tick();
    httpTesting.expectOne('/api/accounts').flush([]);
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

  it('moves the holding to a catalogue instrument without creating anything', async () => {
    await load();
    store.replaceHoldingId.set('h1');

    const moved = store.replaceWith({ kind: 'catalog', instrument: instruments[0] as never });

    const request = await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/instrument'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ instrumentId: 'i1' });
    request.flush({ id: 'h1' });

    await expect(moved).resolves.toEqual({ id: 'h1' });
    expect(store.submitting()).toBe(false);
  });

  it('creates the chosen listing with its own currency, then moves the holding', async () => {
    await load();
    store.replaceHoldingId.set('h1');
    store.query.set('IE00B4L5Y983');

    const moved = store.replaceWith({ kind: 'online', candidate });

    const create = await vi.waitFor(() => httpTesting.expectOne('/api/instruments'));
    expect(create.request.body).toMatchObject({ isin: 'IE00B4L5Y983', currency: 'EUR', sourceRef: 'IWDA.AS' });
    create.flush({ id: 'i9' });
    const move = await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/instrument'));
    expect(move.request.body).toEqual({ instrumentId: 'i9' });
    move.flush({ id: 'h1' });

    await expect(moved).resolves.toEqual({ id: 'h1' });
  });

  it('reuses the instrument it created when the same listing is retried after a failure', async () => {
    await load();
    store.replaceHoldingId.set('h1');
    const pick = { kind: 'online', candidate } as const;

    const first = store.replaceWith(pick);
    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments'))).flush({ id: 'i9' });
    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/instrument'))).flush(null, {
      status: 500,
      statusText: 'Server error',
    });
    await expect(first).resolves.toBeNull();
    expect(store.error()).toBe(true);
    expect(store.duplicate()).toBe(false);

    const second = store.replaceWith(pick);
    httpTesting.expectNone('/api/instruments');
    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/instrument'))).flush({ id: 'h1' });
    await expect(second).resolves.toEqual({ id: 'h1' });
    expect(store.error()).toBe(false);
  });

  it('creates another instrument when a different listing is chosen after a failure', async () => {
    await load();
    store.replaceHoldingId.set('h1');

    const first = store.replaceWith({ kind: 'online', candidate });
    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments'))).flush({ id: 'i9' });
    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/instrument'))).flush(null, {
      status: 500,
      statusText: 'Server error',
    });
    await first;

    const second = store.replaceWith({ kind: 'online', candidate: { ...candidate, sourceRef: 'EUNL.DE' } });
    const create = await vi.waitFor(() => httpTesting.expectOne('/api/instruments'));
    expect(create.request.body).toMatchObject({ sourceRef: 'EUNL.DE' });
    create.flush({ id: 'i10' });
    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/instrument'))).flush({ id: 'h1' });
    await second;
  });

  it('flags a duplicate when the account already holds the listing', async () => {
    await load();
    store.replaceHoldingId.set('h1');

    const moved = store.replaceWith({ kind: 'catalog', instrument: instruments[0] as never });
    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/instrument'))).flush(null, {
      status: 422,
      statusText: 'Unprocessable',
    });

    await expect(moved).resolves.toBeNull();
    expect(store.duplicate()).toBe(true);
    expect(store.error()).toBe(false);
  });

  it('clears the duplicate flag on the next attempt', async () => {
    await load();
    store.replaceHoldingId.set('h1');

    const first = store.replaceWith({ kind: 'catalog', instrument: instruments[0] as never });
    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/instrument'))).flush(null, {
      status: 422,
      statusText: 'Unprocessable',
    });
    await first;

    const second = store.replaceWith({ kind: 'catalog', instrument: instruments[0] as never });
    expect(store.duplicate()).toBe(false);
    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/instrument'))).flush({ id: 'h1' });
    await second;
  });

  it('flags an instrument creation failure without calling the move endpoint', async () => {
    await load();
    store.replaceHoldingId.set('h1');

    const moved = store.replaceWith({ kind: 'online', candidate });
    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments'))).flush(null, {
      status: 500,
      statusText: 'Server error',
    });

    await expect(moved).resolves.toBeNull();
    expect(store.instrumentError()).toBe(true);
    httpTesting.expectNone('/api/holdings/h1/instrument');
  });

  it('does nothing without a holding to replace', async () => {
    await load();

    await expect(store.replaceWith({ kind: 'catalog', instrument: instruments[0] as never })).resolves.toBeNull();
  });

  it('searches online straight away from an initial query', async () => {
    await load();

    store.start('IE00B4L5Y983');

    expect(store.query()).toBe('IE00B4L5Y983');
    const request = await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve'));
    expect(request.request.body).toEqual({ query: 'IE00B4L5Y983' });
    request.flush([candidate]);
    await vi.waitFor(() => expect(store.candidates()).toHaveLength(1));
  });

  it('does not search for an initial query too short for the online source', async () => {
    await load();

    store.start('IW');

    expect(store.query()).toBe('IW');
    httpTesting.expectNone('/api/instruments/resolve');
  });

  it('never offers the instrument of the line being replaced', async () => {
    await load([{ id: 'h1', instrumentId: 'i2', priceCurrency: 'USD' }]);
    store.replaceHoldingId.set('h1');
    store.query.set('msci');

    expect(store.filteredCatalog().map((instrument) => instrument.id)).toEqual(['i1']);
  });

  it('flags a catalogue instrument whose quote is not in euros, by holding quote then by instrument currency', async () => {
    await load([{ id: 'h2', instrumentId: 'i1', priceCurrency: 'USD' }]);
    const euro = instruments[0] as never;
    const usd = instruments[1] as never;

    expect(store.foreignCurrencyOf(euro)).toBeUndefined();
    store.replaceHoldingId.set('h1');
    expect(store.foreignCurrencyOf(euro)).toBe('USD');
    expect(store.foreignCurrencyOf(usd)).toBe('USD');
    store.holdings.set([]);
    expect(store.foreignCurrencyOf(euro)).toBeUndefined();
  });

  it('creates an instrument with the currency the candidate carries, and falls back to euro when unknown', async () => {
    await load();
    store.accountId.set('a1');
    store.quantityText.set('1');

    store.pickOnline({ ...candidate, currency: 'GBP' });
    const first = store.save();
    const gbp = await vi.waitFor(() => httpTesting.expectOne('/api/instruments'));
    expect(gbp.request.body).toMatchObject({ currency: 'GBP' });
    gbp.flush({ id: 'i11' });
    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings'))).flush({ id: 'h2' });
    await first;

    store.pickOnline({ ...candidate, currency: null });
    const second = store.save();
    const unknown = await vi.waitFor(() => httpTesting.expectOne('/api/instruments'));
    expect(unknown.request.body).toMatchObject({ currency: 'EUR' });
    unknown.flush({ id: 'i12' });
    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings'))).flush({ id: 'h3' });
    await second;
  });
});

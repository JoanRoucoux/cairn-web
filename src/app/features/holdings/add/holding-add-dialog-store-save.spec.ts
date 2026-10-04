import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { HoldingResponse, InstrumentCandidateResponse } from '@core/api-client/cairnAPI.schemas';

import { HoldingAddDialogStore } from './holding-add-dialog-store';

const accounts = [
  { id: 'a1', name: 'Northwind PEA', type: 'PEA', institution: 'Northwind Bank' },
  { id: 'a2', name: 'Contoso Trading', type: 'CTO', institution: 'Contoso Bank' },
];

const yahooTitle = {
  id: 'h1',
  accountId: 'a1',
  instrumentId: 'i1',
  instrumentName: 'Amundi MSCI World',
  isin: 'LU1681043599',
  symbol: 'CW8',
  sourceRef: 'CW8.PA',
  assetClass: 'ETF',
  priceSource: 'YAHOO',
  price: 528.31,
  priceCurrency: 'EUR',
} as HoldingResponse;

const manualTitle = {
  ...yahooTitle,
  id: 'h2',
  instrumentId: 'i2',
  instrumentName: 'Corum Origin',
  isin: null,
  symbol: null,
  sourceRef: null,
  assetClass: 'OTHER',
  priceSource: 'MANUAL',
} as HoldingResponse;

const siriusTitle = {
  ...yahooTitle,
  id: 'h3',
  instrumentId: 'i3',
  instrumentName: 'XS2381234567',
  isin: 'XS2381234567',
  symbol: null,
  sourceRef: 'XS2381234567',
  assetClass: 'FUND',
  priceSource: 'SG_SIRIUS',
} as HoldingResponse;

const candidate: InstrumentCandidateResponse = {
  name: 'iShares Core MSCI World',
  source: 'YAHOO',
  sourceRef: 'EUNL.DE',
  assetClass: 'ETF',
  isin: 'IE00B4L5Y983',
  symbol: 'EUNL.DE',
  exchange: 'Xetra',
  probePrice: 97.84,
  currency: 'EUR',
};

describe('HoldingAddDialogStore save', () => {
  let store: HoldingAddDialogStore;
  let httpTesting: HttpTestingController;

  const load = async (): Promise<void> => {
    TestBed.tick();
    httpTesting.expectOne('/api/accounts').flush(accounts);
    httpTesting.expectOne('/api/holdings').flush([yahooTitle, manualTitle, siriusTitle]);
    await TestBed.inject(ApplicationRef).whenStable();
  };

  const position = (accountId = 'a2', quantity = '10', averageCost = ''): void => {
    store.chooseAccount(accountId);
    store.typeQuantity(quantity);
    store.typeAverageCost(averageCost);
  };

  const savedBody = async (): Promise<unknown> => {
    const saving = store.save();
    const request = await vi.waitFor(() => httpTesting.expectOne('/api/holdings'));
    request.flush({ id: 'h9' });
    await expect(saving).resolves.toEqual({ id: 'h9' });

    return request.request.body;
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

  it('is ready only once a title, an account and a positive quantity are set', async () => {
    await load();

    expect(store.titleReady()).toBe(false);
    store.pickCandidate(candidate);
    expect(store.titleReady()).toBe(true);
    expect(store.valid()).toBe(false);

    position('a1', '0');
    expect(store.valid()).toBe(false);

    store.typeQuantity('10');
    expect(store.valid()).toBe(true);
  });

  it('never saves an invalid line', async () => {
    await load();

    await expect(store.save()).resolves.toBeNull();
    httpTesting.expectNone('/api/holdings');
  });

  it('creates a title found online with the line, in its own currency', async () => {
    await load();
    store.pickCandidate({ ...candidate, currency: null, isin: null, symbol: null });
    position('a1', '10', '90');

    await expect(savedBody()).resolves.toEqual({
      accountId: 'a1',
      quantity: 10,
      averageCost: 90,
      instrument: {
        priceSource: 'YAHOO',
        name: 'iShares Core MSCI World',
        assetClass: 'ETF',
        sourceRef: 'EUNL.DE',
        isin: null,
        symbol: null,
        currency: null,
      },
    });
  });

  it('values a title found online at its trial price', async () => {
    await load();
    store.pickCandidate(candidate);
    store.typeQuantity('10');

    expect(store.value()).toBeCloseTo(978.4);

    store.pickCandidate({ ...candidate, probePrice: null });
    expect(store.value()).toBeNull();
  });

  it('re-sends a tracked title inline so the server reuses it', async () => {
    await load();
    store.pickTracked(yahooTitle);
    position();

    await expect(savedBody()).resolves.toMatchObject({
      instrument: {
        priceSource: 'YAHOO',
        name: 'Amundi MSCI World',
        assetClass: 'ETF',
        sourceRef: 'CW8.PA',
        isin: 'LU1681043599',
        symbol: 'CW8',
        currency: 'EUR',
      },
    });
  });

  it('sends the inline tracked title without the fields it lacks', async () => {
    await load();
    store.pickTracked({ ...yahooTitle, isin: undefined, symbol: undefined, priceCurrency: undefined });
    position();

    await expect(savedBody()).resolves.toMatchObject({ instrument: { isin: null, symbol: null, currency: null } });
  });

  it('points at a tracked manual title by id, which has no source reference', async () => {
    await load();
    store.pickTracked(manualTitle);
    position();

    await expect(savedBody()).resolves.toEqual({
      accountId: 'a2',
      quantity: 10,
      averageCost: null,
      instrumentId: 'i2',
    });
  });

  it('values a tracked title at its last price, only in euros', async () => {
    await load();
    store.pickTracked(yahooTitle);
    store.typeQuantity('2');

    expect(store.value()).toBeCloseTo(1056.62);

    store.pickTracked({ ...yahooTitle, priceCurrency: 'USD' });
    expect(store.value()).toBeNull();

    store.pickTracked({ ...yahooTitle, price: null });
    expect(store.value()).toBeNull();
  });

  it('creates an SG Sirius title from its ISIN alone, spaces dropped, with no value', async () => {
    await load();
    store.openMode('sirius');
    store.typeSiriusIsin('XS23 8123 4568');
    position('a1');

    expect(store.titleReady()).toBe(true);
    expect(store.value()).toBeNull();
    await expect(savedBody()).resolves.toMatchObject({
      instrument: { priceSource: 'SG_SIRIUS', assetClass: 'FUND', isin: 'XS2381234568' },
    });
  });

  it('refuses an SG Sirius ISIN that is not one', async () => {
    await load();
    store.openMode('sirius');
    store.typeSiriusIsin('XS238123456X');

    expect(store.titleReady()).toBe(false);
  });

  it('creates a manual title with its name, class and price, valued at that price', async () => {
    await load();
    store.openMode('manual');
    store.typeManualName('  Northwind Private Equity  ');
    expect(store.titleReady()).toBe(false);

    store.typeManualPrice('1 135,00');
    store.chooseManualClass('BOND');
    position('a1', '8');

    expect(store.value()).toBe(9080);
    await expect(savedBody()).resolves.toMatchObject({
      instrument: { priceSource: 'MANUAL', name: 'Northwind Private Equity', assetClass: 'BOND', price: 1135 },
    });
  });

  it('defaults a manual title to the class Autre and refuses a zero price', async () => {
    await load();
    store.openMode('manual');
    store.typeManualName('Corum');
    store.typeManualPrice('0');

    expect(store.manualClass()).toBe('OTHER');
    expect(store.titleReady()).toBe(false);
  });

  it('refuses a title the account already holds, without calling the API', async () => {
    await load();

    store.pickTracked(yahooTitle);
    position('a1');
    await expect(store.save()).resolves.toBeNull();
    expect(store.error()).toBe('duplicate');

    store.chooseAccount('a2');
    expect(store.error()).toBeNull();

    store.pickCandidate({ ...candidate, sourceRef: 'CW8.PA' });
    position('a1');
    await store.save();
    expect(store.error()).toBe('duplicate');

    store.unpick();
    store.openMode('sirius');
    store.typeSiriusIsin('XS2381234567');
    await store.save();
    expect(store.error()).toBe('duplicate');

    httpTesting.expectNone('/api/holdings');
  });

  it('clears the duplicate message once the SG Sirius ISIN is corrected', async () => {
    await load();
    store.openMode('sirius');
    store.typeSiriusIsin('xs2381234567');
    position('a1');
    await store.save();
    expect(store.error()).toBe('duplicate');

    store.typeSiriusIsin('XS2381234568');

    expect(store.error()).toBeNull();
    expect(store.siriusIsinText()).toBe('XS2381234568');
  });

  it('clears an error when a manual field changes, but not on the quantity or the cost', async () => {
    await load();
    store.openMode('manual');

    for (const change of [
      () => store.typeManualName('Northwind'),
      () => store.chooseManualClass('BOND'),
      () => store.typeManualPrice('12a'),
    ]) {
      store.error.set('failed');
      change();
      expect(store.error()).toBeNull();
    }

    store.error.set('failed');
    store.typeQuantity('3x');
    store.typeAverageCost('1,5y');

    expect(store.error()).toBe('failed');
    expect([store.manualPriceText(), store.quantityText(), store.averageCostText()]).toEqual(['12', '3', '1,5']);
  });

  it('reports a refused line and clears the message when the title changes', async () => {
    await load();
    store.pickCandidate(candidate);
    position('a1');

    const saving = store.save();
    expect(store.submitting()).toBe(true);
    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings'))).flush(null, {
      status: 422,
      statusText: 'Unprocessable',
    });

    await expect(saving).resolves.toBeNull();
    expect(store.error()).toBe('failed');
    expect(store.submitting()).toBe(false);

    store.pickTracked(yahooTitle);
    expect(store.error()).toBeNull();
  });
});

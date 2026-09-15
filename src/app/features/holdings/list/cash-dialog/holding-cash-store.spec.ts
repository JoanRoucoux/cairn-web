import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { InstrumentResponse } from '@core/api-client/cairnAPI.schemas';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingCashStore } from './holding-cash-store';

describe('HoldingCashStore', () => {
  let store: HoldingCashStore;
  let httpTesting: HttpTestingController;

  const eurCashInstrument: InstrumentResponse = {
    id: 'euros-1',
    name: 'Euros',
    currency: 'EUR',
    assetClass: 'CASH',
    priceSource: 'MANUAL',
    sourceRef: 'EUR',
  };

  const otherInstrument: InstrumentResponse = {
    id: 'msci-world',
    name: 'Amundi MSCI World',
    currency: 'EUR',
    assetClass: 'ETF',
    priceSource: 'YAHOO',
    sourceRef: 'AMUNDI',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule()],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), HoldingCashStore],
    });
    store = TestBed.inject(HoldingCashStore);
    httpTesting = TestBed.inject(HttpTestingController);

    store.form.amount().value.set(100);
  });

  afterEach(() => httpTesting.verify());

  it('should reuse the existing EUR cash instrument and price it again', async () => {
    const saved = store.save('account-1');

    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments'))).flush([otherInstrument, eurCashInstrument]);

    const quoteRequest = await vi.waitFor(() => httpTesting.expectOne('/api/instruments/euros-1/quotes'));
    expect(quoteRequest.request.body.price).toBe(1);
    quoteRequest.flush({});

    const holdingRequest = await vi.waitFor(() => httpTesting.expectOne('/api/holdings'));
    expect(holdingRequest.request.method).toBe('POST');
    expect(holdingRequest.request.body).toEqual({
      accountId: 'account-1',
      instrumentId: 'euros-1',
      quantity: 100,
      averageCost: 1,
    });
    holdingRequest.flush({});

    await expect(saved).resolves.toBe(true);
  });

  it('should create the EUR cash instrument and record its quote when none exists', async () => {
    const saved = store.save('account-1');

    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments'))).flush([otherInstrument]);

    const createRequest = await vi.waitFor(() => httpTesting.expectOne({ url: '/api/instruments', method: 'POST' }));
    expect(createRequest.request.body).toEqual({
      name: 'Euros',
      currency: 'EUR',
      assetClass: 'CASH',
      priceSource: 'MANUAL',
      sourceRef: 'EUR',
    });
    createRequest.flush({ ...eurCashInstrument, id: 'euros-2' });

    const quoteRequest = await vi.waitFor(() => httpTesting.expectOne('/api/instruments/euros-2/quotes'));
    expect(quoteRequest.request.method).toBe('POST');
    expect(quoteRequest.request.body.price).toBe(1);
    quoteRequest.flush({});

    const holdingRequest = await vi.waitFor(() => httpTesting.expectOne('/api/holdings'));
    expect(holdingRequest.request.body).toEqual({
      accountId: 'account-1',
      instrumentId: 'euros-2',
      quantity: 100,
      averageCost: 1,
    });
    holdingRequest.flush({});

    await expect(saved).resolves.toBe(true);
  });

  it('should report a duplicate account/instrument pair without a generic failure', async () => {
    const saved = store.save('account-1');

    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments'))).flush([eurCashInstrument]);
    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments/euros-1/quotes'))).flush({});

    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings'))).flush(null, {
      status: 409,
      statusText: 'Conflict',
    });

    await expect(saved).resolves.toBe(false);
    expect(store.duplicate()).toBe(true);
    expect(store.error()).toBe(false);
  });

  it('should report a generic failure for anything else', async () => {
    const saved = store.save('account-1');

    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments'))).flush([eurCashInstrument]);
    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments/euros-1/quotes'))).flush({});

    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings'))).flush(null, {
      status: 500,
      statusText: 'Server error',
    });

    await expect(saved).resolves.toBe(false);
    expect(store.error()).toBe(true);
    expect(store.duplicate()).toBe(false);
  });
});

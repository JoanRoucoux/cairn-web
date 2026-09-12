import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { of } from 'rxjs';

import type {
  CreateInstrumentRequestAssetClass,
  CreateInstrumentRequestPriceSource,
  InstrumentCandidateResponse,
} from '@core/api-client/cairnAPI.schemas';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { InstrumentFormStore } from './instrument-form-store';

describe('InstrumentFormStore', () => {
  let store: InstrumentFormStore;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({})) } },
        InstrumentFormStore,
      ],
    });
    store = TestBed.inject(InstrumentFormStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should return the candidates the server resolved', async () => {
    const lookup = store.lookup('FR0011550185');

    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve'))).flush([
      {
        sourceRef: 'ESE.PA',
        name: 'BNP Paribas Easy S&P 500',
        source: 'YAHOO',
        assetClass: 'ETF',
        probePrice: 33.3069,
      },
    ]);
    await lookup;

    expect(store.candidates()).toHaveLength(1);
    expect(store.notFound()).toBe(false);
  });

  it('should send the query as the request body', async () => {
    const lookup = store.lookup('FR0011550185');

    const request = await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve'));
    expect(request.request.body).toEqual({ query: 'FR0011550185' });
    request.flush([]);
    await lookup;
  });

  it('should treat a 422 as "nothing resolved", not as a crash', async () => {
    const lookup = store.lookup('QS0000000001');

    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve'))).flush(null, {
      status: 422,
      statusText: 'Unprocessable',
    });
    await lookup;

    expect(store.notFound()).toBe(true);
    expect(store.searching()).toBe(false);
  });

  it('should fill the draft from the chosen candidate', () => {
    store.apply(
      {
        sourceRef: 'ESE.PA',
        name: 'BNP Paribas Easy S&P 500',
        source: 'YAHOO',
        assetClass: 'ETF',
        probePrice: 33.3069,
      } as InstrumentCandidateResponse,
      'FR0011550185',
    );

    expect(store.form.name().value()).toBe('BNP Paribas Easy S&P 500');
    expect(store.form.sourceRef().value()).toBe('ESE.PA');
    expect(store.form.priceSource().value()).toBe('YAHOO');
    expect(store.form.isin().value()).toBe('FR0011550185');
  });

  it('should post the instrument once the draft is valid', async () => {
    store.form.name().value.set('BNP Paribas Easy S&P 500');

    const saved = store.save();

    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments'))).flush({});

    await expect(saved).resolves.toBe(true);
  });

  it('should refuse a draft with no currency, asset class or price source', async () => {
    store.form.name().value.set('BNP Paribas Easy S&P 500');
    // The selects offer no empty option, so this state is unreachable through the UI; the schema
    // still guards it, and the cast mirrors how an emptied enum field is represented elsewhere.
    store.form.currency().value.set('');
    store.form.assetClass().value.set('' as CreateInstrumentRequestAssetClass);
    store.form.priceSource().value.set('' as CreateInstrumentRequestPriceSource);

    await expect(store.save()).resolves.toBe(false);
    httpTesting.expectNone('/api/instruments');
    expect(store.form.currency().errors()).not.toHaveLength(0);
    expect(store.form.assetClass().errors()).not.toHaveLength(0);
    expect(store.form.priceSource().errors()).not.toHaveLength(0);
  });

  it('should refuse a description over the length limit', async () => {
    store.form.name().value.set('BNP Paribas Easy S&P 500');
    store.form.description().value.set('a'.repeat(281));

    await expect(store.save()).resolves.toBe(false);
    httpTesting.expectNone('/api/instruments');
  });

  it('should report a failure instead of pretending it worked', async () => {
    store.form.name().value.set('BNP Paribas Easy S&P 500');

    const saved = store.save();

    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments'))).flush(null, {
      status: 422,
      statusText: 'Unprocessable',
    });

    await expect(saved).resolves.toBe(false);
    expect(store.error()).toBe(true);
  });
});

describe('InstrumentFormStore in edit mode', () => {
  let store: InstrumentFormStore;
  let httpTesting: HttpTestingController;

  const instrument = {
    id: 'i1',
    name: 'BNP Paribas Easy S&P 500',
    isin: 'FR0011550185',
    currency: 'EUR',
    assetClass: 'ETF',
    priceSource: 'YAHOO',
    sourceRef: 'ESE.PA',
    description: 'ETF tracking the S&P 500.',
    holdingCount: 2,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ instrumentId: instrument.id })) },
        },
        InstrumentFormStore,
      ],
    });
    store = TestBed.inject(InstrumentFormStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  const settle = async (): Promise<void> => {
    for (let i = 0; i < 10; i++) {
      TestBed.tick();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  };

  it('should prefill the draft from the loaded instrument', async () => {
    (await vi.waitFor(() => httpTesting.expectOne(`/api/instruments/${instrument.id}`))).flush(instrument);
    await settle();

    expect(store.form.name().value()).toBe(instrument.name);
    expect(store.form.isin().value()).toBe(instrument.isin);
    expect(store.form.sourceRef().value()).toBe(instrument.sourceRef);
    expect(store.form.description().value()).toBe(instrument.description);
  });

  it('should update the instrument once the draft is valid', async () => {
    (await vi.waitFor(() => httpTesting.expectOne(`/api/instruments/${instrument.id}`))).flush(instrument);
    await settle();

    const saved = store.save();

    const request = await vi.waitFor(() => httpTesting.expectOne(`/api/instruments/${instrument.id}`));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).not.toHaveProperty('currency');
    request.flush(instrument);

    await expect(saved).resolves.toBe(true);
  });

  it('should report a failure instead of pretending it worked', async () => {
    (await vi.waitFor(() => httpTesting.expectOne(`/api/instruments/${instrument.id}`))).flush(instrument);
    await settle();

    const saved = store.save();

    (await vi.waitFor(() => httpTesting.expectOne(`/api/instruments/${instrument.id}`))).flush(null, {
      status: 422,
      statusText: 'Unprocessable',
    });

    await expect(saved).resolves.toBe(false);
    expect(store.error()).toBe(true);
  });
});

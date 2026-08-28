import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { InstrumentCandidateResponse } from '@core/api-client/cairnAPI.schemas';

import { InstrumentFormStore } from './instrument-form-store';

describe('InstrumentFormStore', () => {
  let store: InstrumentFormStore;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
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

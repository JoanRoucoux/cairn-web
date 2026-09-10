import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingFormDialogStore } from './holding-form-dialog-store';

describe('HoldingFormDialogStore', () => {
  let store: HoldingFormDialogStore;
  let httpTesting: HttpTestingController;

  const fillValidDraft = (): void => {
    store.form.accountId().value.set('a1');
    store.form.instrumentId().value.set('i1');
    store.form.quantity().value.set(676);
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        HoldingFormDialogStore,
      ],
    });
    store = TestBed.inject(HoldingFormDialogStore);
    httpTesting = TestBed.inject(HttpTestingController);
    TestBed.tick();
    httpTesting.match((request) => request.url === '/api/accounts').forEach((request) => request.flush([]));
    httpTesting.match((request) => request.url === '/api/instruments').forEach((request) => request.flush([]));
  });

  afterEach(() => httpTesting.verify());

  it('should refuse an incomplete draft', async () => {
    await expect(store.save()).resolves.toBe(false);
  });

  it('should create a holding when no id is given', async () => {
    fillValidDraft();

    const saved = store.save();

    const request = await vi.waitFor(() => httpTesting.expectOne('/api/holdings'));
    expect(request.request.method).toBe('POST');
    request.flush({});

    await expect(saved).resolves.toBe(true);
  });

  it('should update a holding when an id is given', async () => {
    fillValidDraft();

    const saved = store.save('h1');

    const request = await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1'));
    expect(request.request.method).toBe('PATCH');
    request.flush({});

    await expect(saved).resolves.toBe(true);
  });

  it('should prefill from an existing holding, cost basis included when it exists', () => {
    store.prefill({ accountId: 'a9', instrumentId: 'i9', quantity: 12, averageCost: 3.5 } as HoldingResponse);

    expect(store.form.accountId().value()).toBe('a9');
    expect(store.form.averageCost().value()).toBe(3.5);
  });

  it('should leave the cost basis null when the holding has none', () => {
    store.prefill({ accountId: 'a9', instrumentId: 'i9', quantity: 12, averageCost: null } as HoldingResponse);

    expect(store.form.averageCost().value()).toBeNull();
  });
});

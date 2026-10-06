import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingEditDialogStore } from './holding-edit-dialog-store';

const holding = { id: 'h1', quantity: 676, averageCost: 26.654 } as unknown as HoldingResponse;

describe('HoldingEditDialogStore', () => {
  let store: HoldingEditDialogStore;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        HoldingEditDialogStore,
      ],
    });
    store = TestBed.inject(HoldingEditDialogStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('prefills the form with the holding', () => {
    store.prefill(holding);

    expect(store.form.quantity().value()).toBe('676');
    expect(store.form.averageCost().value()).toBe('26.654');
  });

  it('updates the quantity and cost basis', async () => {
    store.prefill(holding);
    store.form.quantity().value.set('700');

    const saved = store.save('h1');

    const request = await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1'));
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ quantity: 700, averageCost: 26.654 });
    request.flush({ id: 'h9' });

    await expect(saved).resolves.toEqual({ id: 'h9' });
  });

  it('reports a generic failure', async () => {
    store.prefill(holding);

    const saved = store.save('h1');

    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1'))).flush(null, {
      status: 500,
      statusText: 'Server error',
    });

    await expect(saved).resolves.toBeNull();
    expect(store.error()).toBe(true);
  });
});

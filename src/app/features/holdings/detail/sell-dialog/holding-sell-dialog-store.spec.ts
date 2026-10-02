import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { HoldingSellDialogStore } from './holding-sell-dialog-store';

describe('HoldingSellDialogStore', () => {
  let store: HoldingSellDialogStore;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        HoldingSellDialogStore,
      ],
    });
    store = TestBed.inject(HoldingSellDialogStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('is invalid when the quantity is zero, missing or exceeds the held quantity', () => {
    store.quantityText.set('0');
    expect(store.valid(500)).toBe(false);

    store.quantityText.set('501');
    expect(store.valid(500)).toBe(false);

    store.quantityText.set('100');
    expect(store.valid(500)).toBe(true);
  });

  it('reports a partial sale as kept', async () => {
    const saved = store.save('h1', 100);

    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/sell'))).flush(
      { id: 'h1' },
      { status: 200, statusText: 'OK' },
    );

    await expect(saved).resolves.toEqual({ outcome: 'kept', holding: { id: 'h1' } });
  });

  it('reports selling the whole quantity as closed', async () => {
    const saved = store.save('h1', 500);

    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/sell'))).flush(null, {
      status: 204,
      statusText: 'No Content',
    });

    await expect(saved).resolves.toEqual({ outcome: 'closed', holding: null });
  });

  it('reports a refusal from the server', async () => {
    const saved = store.save('h1', 600);

    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/sell'))).flush(null, {
      status: 422,
      statusText: 'Unprocessable',
    });

    await expect(saved).resolves.toBeNull();
    expect(store.error()).toBe(true);
  });
});

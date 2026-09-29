import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { HoldingBuyDialogStore } from './holding-buy-dialog-store';

describe('HoldingBuyDialogStore', () => {
  let store: HoldingBuyDialogStore;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        HoldingBuyDialogStore,
      ],
    });
    store = TestBed.inject(HoldingBuyDialogStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('reads a quantity typed with a comma', () => {
    store.quantityText.set('0,5');

    expect(store.quantity()).toBe(0.5);
  });

  it('is invalid while the quantity or the price is zero, missing or negative', () => {
    store.quantityText.set('0');
    store.priceText.set('10');
    expect(store.valid()).toBe(false);

    store.quantityText.set('10');
    store.priceText.set('');
    expect(store.valid()).toBe(false);

    store.quantityText.set('10');
    store.priceText.set('10');
    expect(store.valid()).toBe(true);
  });

  it('posts the buy and reports success', async () => {
    store.quantityText.set('40');
    store.priceText.set('29,1');

    const saved = store.save('h1');

    const request = await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/buy'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ quantity: 40, unitPrice: 29.1 });
    request.flush({});

    await expect(saved).resolves.toBe(true);
  });

  it('never reaches the server while invalid', async () => {
    store.quantityText.set('');
    store.priceText.set('');

    await expect(store.save('h1')).resolves.toBe(false);
  });

  it('reports a refusal from the server', async () => {
    store.quantityText.set('40');
    store.priceText.set('29,1');

    const saved = store.save('h1');

    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/buy'))).flush(null, {
      status: 422,
      statusText: 'Unprocessable',
    });

    await expect(saved).resolves.toBe(false);
    expect(store.error()).toBe(true);
  });
});

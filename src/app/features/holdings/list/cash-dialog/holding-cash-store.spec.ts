import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingCashStore } from './holding-cash-store';

describe('HoldingCashStore', () => {
  let store: HoldingCashStore;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule()],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), HoldingCashStore],
    });
    store = TestBed.inject(HoldingCashStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should prefill the form with the current balance', () => {
    store.prefill(732.4);

    expect(store.form.amount().value()).toBe(732.4);
  });

  it('should set the cash balance', async () => {
    store.form.amount().value.set(500);

    const saved = store.save('account-1');

    const request = await vi.waitFor(() => httpTesting.expectOne('/api/accounts/account-1/cash'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ amount: 500 });
    request.flush(null, { status: 204, statusText: 'No Content' });

    await expect(saved).resolves.toBe(true);
  });

  it('should report a generic failure', async () => {
    store.form.amount().value.set(500);

    const saved = store.save('account-1');

    (await vi.waitFor(() => httpTesting.expectOne('/api/accounts/account-1/cash'))).flush(null, {
      status: 500,
      statusText: 'Server error',
    });

    await expect(saved).resolves.toBe(false);
    expect(store.error()).toBe(true);
  });

  it('should refuse a negative amount before it ever reaches the API', async () => {
    store.form.amount().value.set(-10);

    const saved = store.save('account-1');

    await expect(saved).resolves.toBe(false);
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { ManualQuoteDialogStore } from './manual-quote-dialog-store';

describe('ManualQuoteDialogStore', () => {
  let store: ManualQuoteDialogStore;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        ManualQuoteDialogStore,
      ],
    });
    store = TestBed.inject(ManualQuoteDialogStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should refuse to send an incomplete form', async () => {
    await expect(store.save('i1')).resolves.toBe(false);
  });

  it('should refuse a quote with no date', async () => {
    store.form.price().value.set(33.3069);
    store.form.asOf().value.set('');

    await expect(store.save('i1')).resolves.toBe(false);
    httpTesting.expectNone('/api/instruments/i1/quotes');
  });

  it('should post the quote for the instrument', async () => {
    store.form.price().value.set(33.3069);
    store.form.asOf().value.set('2026-08-21');

    const saved = store.save('i1');

    const request = await vi.waitFor(() => httpTesting.expectOne('/api/instruments/i1/quotes'));
    expect(request.request.body).toEqual({ asOf: '2026-08-21', price: 33.3069 });
    request.flush({});

    await expect(saved).resolves.toBe(true);
  });

  it('should report a failure instead of pretending it worked', async () => {
    store.form.price().value.set(33.3069);

    const saved = store.save('i1');

    const request = await vi.waitFor(() => httpTesting.expectOne('/api/instruments/i1/quotes'));
    request.flush(null, { status: 422, statusText: 'Unprocessable' });

    await expect(saved).resolves.toBe(false);
    expect(store.error()).toBe(true);
  });
});

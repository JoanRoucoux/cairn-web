import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { AccountFormDialogStore } from './account-form-dialog-store';

describe('AccountFormDialogStore', () => {
  let store: AccountFormDialogStore;
  let httpTesting: HttpTestingController;

  const fillValidDraft = (): void => {
    store.form.name().value.set('Northwind PEA');
    store.form.type().value.set('PEA');
    store.form.institution().value.set('Northwind Bank');
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        AccountFormDialogStore,
      ],
    });
    store = TestBed.inject(AccountFormDialogStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should refuse an incomplete draft', async () => {
    await expect(store.save()).resolves.toBe(false);
  });

  it('should create an account when no id is given', async () => {
    fillValidDraft();

    const saved = store.save();

    const request = await vi.waitFor(() => httpTesting.expectOne('/api/accounts'));
    expect(request.request.method).toBe('POST');
    request.flush({});

    await expect(saved).resolves.toBe(true);
  });

  it('should update an account when an id is given', async () => {
    fillValidDraft();

    const saved = store.save('a1');

    const request = await vi.waitFor(() => httpTesting.expectOne('/api/accounts/a1'));
    expect(request.request.method).toBe('PUT');
    request.flush({});

    await expect(saved).resolves.toBe(true);
  });

  it('should prefill from an existing account', () => {
    store.prefill({ name: 'Northwind PEA', type: 'PEA', institution: 'Northwind Bank' });

    expect(store.form.name().value()).toBe('Northwind PEA');
    expect(store.form.institution().value()).toBe('Northwind Bank');
  });

  it('should flag a name conflict on a 409 without a generic failure', async () => {
    fillValidDraft();

    const saved = store.save();

    (await vi.waitFor(() => httpTesting.expectOne('/api/accounts'))).flush(null, {
      status: 409,
      statusText: 'Conflict',
    });

    await expect(saved).resolves.toBe(false);
    expect(store.nameConflict()).toBe(true);
    expect(store.error()).toBe(false);
  });

  it('should flag the envelope on a 422 without a generic failure, and clear it on the next save', async () => {
    fillValidDraft();

    const saved = store.save('a1');

    (await vi.waitFor(() => httpTesting.expectOne('/api/accounts/a1'))).flush(null, {
      status: 422,
      statusText: 'Unprocessable Entity',
    });

    await expect(saved).resolves.toBe(false);
    expect(store.savingsConflict()).toBe(true);
    expect(store.error()).toBe(false);
    expect(store.nameConflict()).toBe(false);

    const again = store.save('a1');

    (await vi.waitFor(() => httpTesting.expectOne('/api/accounts/a1'))).flush({ id: 'a1' });
    await again;

    expect(store.savingsConflict()).toBe(false);
  });

  it('should report a generic failure on any other error', async () => {
    fillValidDraft();

    const saved = store.save();

    (await vi.waitFor(() => httpTesting.expectOne('/api/accounts'))).flush(null, {
      status: 500,
      statusText: 'Server Error',
    });

    await expect(saved).resolves.toBe(false);
    expect(store.error()).toBe(true);
    expect(store.nameConflict()).toBe(false);
  });
});

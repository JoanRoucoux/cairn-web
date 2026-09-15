import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import type { InstrumentResponse } from '@core/api-client/cairnAPI.schemas';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingCashDialog } from './holding-cash-dialog';

describe('HoldingCashDialog', () => {
  let httpTesting: HttpTestingController;
  const saved = vi.fn();
  const dismissed = vi.fn();

  const eurCashInstrument: InstrumentResponse = {
    id: 'euros-1',
    name: 'Euros',
    currency: 'EUR',
    assetClass: 'CASH',
    priceSource: 'MANUAL',
    sourceRef: 'EUR',
  };

  const renderDialog = async (): Promise<void> => {
    await render(HoldingCashDialog, {
      inputs: { accountId: 'account-1' },
      on: { saved, dismissed },
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslocoScope('holdings'),
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
  };

  afterEach(() => {
    httpTesting.verify();
    saved.mockClear();
    dismissed.mockClear();
  });

  it('should emit dismissed on cancel', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.click(screen.getByTestId('holding-cash-cancel'));

    expect(dismissed).toHaveBeenCalled();
  });

  it('should emit dismissed when the native dialog closes', async () => {
    await renderDialog();

    screen.getByRole('dialog').dispatchEvent(new Event('close'));

    expect(dismissed).toHaveBeenCalled();
  });

  it('should refuse a zero amount', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('holding-cash-amount'), '0');
    await user.click(screen.getByTestId('holding-cash-submit'));

    expect(screen.getByTestId('holding-cash-amount')).toBeInvalid();
    expect(saved).not.toHaveBeenCalled();
  });

  it('should emit saved once the cash line has been created', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('holding-cash-amount'), '250');
    await user.click(screen.getByTestId('holding-cash-submit'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments'))).flush([eurCashInstrument]);
    (await vi.waitFor(() => httpTesting.expectOne(`/api/instruments/${eurCashInstrument.id}/quotes`))).flush({});
    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings'))).flush({});

    await vi.waitFor(() => expect(saved).toHaveBeenCalled());
  });

  it('should show a generic error when the API refuses for another reason', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('holding-cash-amount'), '250');
    await user.click(screen.getByTestId('holding-cash-submit'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments'))).flush([eurCashInstrument]);
    (await vi.waitFor(() => httpTesting.expectOne(`/api/instruments/${eurCashInstrument.id}/quotes`))).flush({});
    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings'))).flush(null, {
      status: 500,
      statusText: 'Server error',
    });

    expect(await screen.findByTestId('holding-cash-error')).toBeInTheDocument();
    expect(saved).not.toHaveBeenCalled();
  });

  it('should show a dedicated message when the account already has a cash line', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('holding-cash-amount'), '250');
    await user.click(screen.getByTestId('holding-cash-submit'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments'))).flush([eurCashInstrument]);
    (await vi.waitFor(() => httpTesting.expectOne(`/api/instruments/${eurCashInstrument.id}/quotes`))).flush({});
    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings'))).flush(null, {
      status: 409,
      statusText: 'Conflict',
    });

    expect(await screen.findByTestId('holding-cash-duplicate')).toBeInTheDocument();
    expect(saved).not.toHaveBeenCalled();
  });
});

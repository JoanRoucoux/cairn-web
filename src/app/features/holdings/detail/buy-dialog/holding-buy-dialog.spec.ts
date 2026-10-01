import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingBuyDialog } from './holding-buy-dialog';

const holding = {
  id: 'h1',
  accountName: 'Saxo Investor',
  instrumentName: 'Amundi MSCI World',
  quantity: 500,
  averageCost: 24.12,
  price: 28.6368,
} as unknown as HoldingResponse;

describe('HoldingBuyDialog', () => {
  let httpTesting: HttpTestingController;
  const bought = vi.fn();
  const dismissed = vi.fn();

  const renderDialog = async (input: HoldingResponse = holding): Promise<void> => {
    await render(HoldingBuyDialog, {
      inputs: { holding: input },
      on: { bought, dismissed },
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'en-GB' },
        provideTranslocoScope('holdings'),
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
  };

  afterEach(() => {
    httpTesting.verify();
    bought.mockClear();
    dismissed.mockClear();
  });

  it('keeps the submit button disabled until both fields are positive', async () => {
    const user = userEvent.setup();
    await renderDialog();

    expect(screen.getByTestId('holding-buy-submit')).toBeDisabled();

    await user.type(screen.getByTestId('holding-buy-quantity'), '40');
    expect(screen.getByTestId('holding-buy-submit')).toBeDisabled();

    await user.type(screen.getByTestId('holding-buy-price'), '29,1');
    expect(screen.getByTestId('holding-buy-submit')).toBeEnabled();
  });

  it('reads a quantity typed with a comma and spaces', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('holding-buy-quantity'), '1 200,5');
    await user.type(screen.getByTestId('holding-buy-price'), '10');
    await user.click(screen.getByTestId('holding-buy-submit'));

    const request = await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/buy'));
    expect(request.request.body).toEqual({ quantity: 1200.5, unitPrice: 10 });
    request.flush({});
  });

  it('previews the weighted average cost before submitting', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('holding-buy-quantity'), '40');
    await user.type(screen.getByTestId('holding-buy-price'), '29.1');

    expect(screen.getByText('€24.49')).toBeInTheDocument();
  });

  it('emits dismissed when Annuler is clicked', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.click(screen.getByTestId('holding-buy-cancel'));

    expect(dismissed).toHaveBeenCalled();
  });

  it('emits dismissed on cancel via the native dialog close', async () => {
    await renderDialog();

    screen.getByRole('dialog').dispatchEvent(new Event('close'));

    expect(dismissed).toHaveBeenCalled();
  });

  it('emits bought once the purchase is saved', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('holding-buy-quantity'), '40');
    await user.type(screen.getByTestId('holding-buy-price'), '29.1');
    await user.click(screen.getByTestId('holding-buy-submit'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/buy'))).flush({});

    await vi.waitFor(() => expect(bought).toHaveBeenCalled());
  });

  it('shows a refusal from the server', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('holding-buy-quantity'), '40');
    await user.type(screen.getByTestId('holding-buy-price'), '29.1');
    await user.click(screen.getByTestId('holding-buy-submit'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/buy'))).flush(null, {
      status: 422,
      statusText: 'Unprocessable',
    });

    expect(await screen.findByTestId('holding-buy-error')).toBeInTheDocument();
    expect(bought).not.toHaveBeenCalled();
  });

  it('shows the current price in the hint', async () => {
    await renderDialog();

    expect(screen.getByTestId('holding-buy-hint')).toHaveTextContent('holdings.buy.currentPrice');
  });

  it('takes the unit price as the cost basis when none was known yet', async () => {
    const user = userEvent.setup();
    await renderDialog({ ...holding, averageCost: undefined } as unknown as HoldingResponse);

    expect(screen.getByTestId('holding-buy-hint')).toHaveTextContent('holdings.buy.noCostHint');
    expect(screen.getByText('holdings.buy.rows.averageCostUnknown')).toBeInTheDocument();

    await user.type(screen.getByTestId('holding-buy-quantity'), '20');
    await user.type(screen.getByTestId('holding-buy-price'), '51.2');

    expect(screen.getByText('€51.20')).toBeInTheDocument();
  });
});

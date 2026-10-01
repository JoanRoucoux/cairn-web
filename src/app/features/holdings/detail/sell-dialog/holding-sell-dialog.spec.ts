import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingSellDialog } from './holding-sell-dialog';

const holding = {
  id: 'h1',
  accountName: 'Saxo Investor',
  instrumentName: 'Amundi MSCI World',
  quantity: 500,
  averageCost: 24.12,
  price: 28.6368,
} as unknown as HoldingResponse;

describe('HoldingSellDialog', () => {
  let httpTesting: HttpTestingController;
  const sold = vi.fn();
  const dismissed = vi.fn();

  const renderDialog = async (input: HoldingResponse = holding): Promise<void> => {
    await render(HoldingSellDialog, {
      inputs: { holding: input },
      on: { sold, dismissed },
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
    sold.mockClear();
    dismissed.mockClear();
  });

  it('keeps an empty or zero quantity from enabling the button', async () => {
    await renderDialog();

    expect(screen.getByTestId('holding-sell-submit')).toBeDisabled();
  });

  it('shows a negative message when the quantity exceeds the holding, and never reaches the server', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('holding-sell-quantity'), '600');

    expect(screen.getByTestId('holding-sell-quantity')).toBeInvalid();
    expect(screen.getByText('holdings.sell.over_other')).toBeInTheDocument();
    expect(screen.getByTestId('holding-sell-submit')).toBeDisabled();
  });

  it('fills the exact held quantity, including crypto decimals, with "Tout vendre"', async () => {
    const user = userEvent.setup();
    await renderDialog({ ...holding, quantity: 2.4513 } as unknown as HoldingResponse);

    await user.click(screen.getByTestId('holding-sell-all'));

    expect(screen.getByTestId('holding-sell-quantity')).toHaveValue('2.4513');
  });

  it('previews the estimated realized gain', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('holding-sell-quantity'), '100');

    expect(screen.getByText('€451.68')).toBeInTheDocument();
  });

  it('turns the button destructive, enabled, and warns when selling everything', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.click(screen.getByTestId('holding-sell-all'));

    const submit = screen.getByTestId('holding-sell-submit');
    expect(submit).toHaveTextContent('holdings.sell.submitCloses');
    expect(submit).toHaveClass('bg-(--destructive)');
    expect(submit).toBeEnabled();
    expect(screen.getByTestId('holding-sell-closes-warning')).toBeInTheDocument();
  });

  it('emits sold with closed=false after a partial sale', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('holding-sell-quantity'), '100');
    await user.click(screen.getByTestId('holding-sell-submit'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/sell'))).flush(
      {},
      { status: 200, statusText: 'OK' },
    );

    await vi.waitFor(() => expect(sold).toHaveBeenCalledWith(false));
  });

  it('emits sold with closed=true after selling everything', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.click(screen.getByTestId('holding-sell-all'));
    await user.click(screen.getByTestId('holding-sell-submit'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/sell'))).flush(null, {
      status: 204,
      statusText: 'No Content',
    });

    await vi.waitFor(() => expect(sold).toHaveBeenCalledWith(true));
  });

  it('shows a refusal from the server', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('holding-sell-quantity'), '100');
    await user.click(screen.getByTestId('holding-sell-submit'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/sell'))).flush(null, {
      status: 422,
      statusText: 'Unprocessable',
    });

    expect(await screen.findByTestId('holding-sell-error')).toBeInTheDocument();
    expect(sold).not.toHaveBeenCalled();
  });

  it('shows no realized gain when the cost basis is unknown', async () => {
    const user = userEvent.setup();
    await renderDialog({ ...holding, averageCost: undefined } as unknown as HoldingResponse);

    await user.type(screen.getByTestId('holding-sell-quantity'), '100');

    expect(screen.getByText('holdings.sell.rows.realizedGainUnknown')).toBeInTheDocument();
  });

  it('shows no estimated amount for a line with no current price', async () => {
    const user = userEvent.setup();
    await renderDialog({ ...holding, price: undefined } as unknown as HoldingResponse);

    await user.type(screen.getByTestId('holding-sell-quantity'), '100');

    expect(screen.queryByText('holdings.sell.rows.realizedGainUnknown')).not.toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('emits dismissed when Annuler is clicked', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.click(screen.getByTestId('holding-sell-cancel'));

    expect(dismissed).toHaveBeenCalled();
  });

  it('emits dismissed on cancel via the native dialog close', async () => {
    await renderDialog();

    screen.getByRole('dialog').dispatchEvent(new Event('close'));

    expect(dismissed).toHaveBeenCalled();
  });

  it('never calls the server when confirm is invoked while invalid', async () => {
    const { fixture } = await render(HoldingSellDialog, {
      inputs: { holding },
      on: { sold, dismissed },
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

    await (fixture.componentInstance as unknown as { confirm(): Promise<void> }).confirm();

    httpTesting.expectNone('/api/holdings/h1/sell');
  });
});

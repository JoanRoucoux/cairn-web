import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, type Provider, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { UI_AMOUNT_MASKED } from '@joanroucoux/cairn-ui/amount';
import { UiToasts } from '@joanroucoux/cairn-ui/toast';
import { TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { slowDialogExit } from '@shared/testing/dialog-exit';
import { expectSubmitting } from '@shared/testing/submitting';
import { delayedScopeLoader, getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingChanges } from '../../holding-changes';
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

  const renderDialog = async (
    input: HoldingResponse = holding,
    masked = false,
    extraProviders: Provider[] = [],
  ): Promise<void> => {
    await render(HoldingSellDialog, {
      inputs: { holding: input },
      on: { sold, dismissed },
      imports: [getTranslocoTestingModule()],
      providers: [
        HoldingChanges,
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'en-GB' },
        provideTranslocoScope('holdings'),
        { provide: UI_AMOUNT_MASKED, useValue: signal(masked) },
        ...extraProviders,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
  };

  afterEach(() => {
    httpTesting.verify();
    sold.mockClear();
    dismissed.mockClear();
  });

  it('does not translate its holdings scope keys before the scope has loaded', async () => {
    const translate = vi.spyOn(TranslocoService.prototype, 'translate');
    await renderDialog(holding, false, [delayedScopeLoader()]);

    expect(translate.mock.calls.filter(([key]) => /^holdings.sell.(submit|held|over)/.test(String(key)))).toEqual([]);

    translate.mockRestore();
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

  it('returns focus to the quantity field after Tout vendre', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.click(screen.getByTestId('holding-sell-all'));

    expect(screen.getByTestId('holding-sell-quantity')).toHaveFocus();
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

    expect(screen.getByText('+€451.68')).toBeInTheDocument();
  });

  it('shows a loss with a minus sign and the negative tone', async () => {
    const user = userEvent.setup();
    await renderDialog({ ...holding, price: 20 } as unknown as HoldingResponse);

    await user.type(screen.getByTestId('holding-sell-quantity'), '100');

    const gain = screen.getByText('−€412.00');
    expect(gain.closest('ui-delta')).toHaveClass('text-(--negative)');
  });

  it('masks the price in the hint and the recap amounts when amounts are hidden', async () => {
    const user = userEvent.setup();
    await renderDialog(holding, true);

    await user.type(screen.getByTestId('holding-sell-quantity'), '100');

    expect(screen.getByTestId('holding-sell-hint')).not.toHaveTextContent('28.64');
    expect(screen.queryByText('+€451.68')).not.toBeInTheDocument();
    expect(screen.queryByText('€2,863.68')).not.toBeInTheDocument();
  });

  it('writes the average cost and its note in one run', async () => {
    await renderDialog();

    expect(screen.getByText('holdings.sell.rows.averageCostUnchanged', { exact: false })).toHaveTextContent(
      '€24.12holdings.sell.rows.averageCostUnchanged',
    );
  });

  it('shows the held quantity and the price in the hint', async () => {
    await renderDialog();

    expect(screen.getByTestId('holding-sell-hint')).toHaveTextContent(/holdings.sell.held_other · holdings.sell.price/);
  });

  it('reads Unknown for an unknown cost basis', async () => {
    await renderDialog({ ...holding, averageCost: undefined } as unknown as HoldingResponse);

    expect(screen.getByText('holdings.sell.rows.averageCostUnknown')).toBeInTheDocument();
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

  it('submits with Enter from the quantity field', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('holding-sell-quantity'), '100{Enter}');

    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/sell'))).flush({ id: 'h1' });

    await vi.waitFor(() =>
      expect(sold).toHaveBeenCalledWith({ outcome: 'kept', holdingId: 'h1', holding: { id: 'h1' } }),
    );
  });

  it('does not submit with Enter when the quantity is over what is held', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('holding-sell-quantity'), '600{Enter}');

    httpTesting.expectNone('/api/holdings/h1/sell');
  });

  it('puts the over-held message in the hint row and marks the field invalid', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('holding-sell-quantity'), '600');

    expect(screen.getByTestId('holding-sell-hint')).toHaveTextContent('holdings.sell.over_other');
    expect(screen.getByTestId('holding-sell-hint')).toHaveClass('text-(--negative)');
    expect(screen.getByTestId('holding-sell-hint')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByTestId('holding-sell-quantity')).toBeInvalid();
  });

  it('emits sold with kept after a partial sale', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('holding-sell-quantity'), '100');
    await user.click(screen.getByTestId('holding-sell-submit'));
    await vi.waitFor(() => expectSubmitting(screen.getByTestId('holding-sell-submit')));

    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/sell'))).flush(
      { id: 'h1' },
      { status: 200, statusText: 'OK' },
    );

    await vi.waitFor(() =>
      expect(sold).toHaveBeenCalledWith({ outcome: 'kept', holdingId: 'h1', holding: { id: 'h1' } }),
    );
    expect(TestBed.inject(UiToasts).toast()?.text).toBe('holdings.toasts.sold');
    expect(TestBed.inject(HoldingChanges).lastTouched()?.id).toBe('h1');
    expect(TestBed.inject(HoldingChanges).lastRevealed()).toBe(TestBed.inject(HoldingChanges).lastTouched());
    expect(TestBed.inject(HoldingChanges).lastRemoved()).toBeNull();
  });

  it('emits sold with closed after selling everything', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.click(screen.getByTestId('holding-sell-all'));
    await user.click(screen.getByTestId('holding-sell-submit'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/sell'))).flush(null, {
      status: 204,
      statusText: 'No Content',
    });

    await vi.waitFor(() => expect(sold).toHaveBeenCalledWith({ outcome: 'closed', holdingId: 'h1', holding: null }));
    expect(TestBed.inject(UiToasts).toast()?.text).toBe('holdings.toasts.deleted');
    expect(TestBed.inject(HoldingChanges).lastRemoved()?.id).toBe('h1');
    expect(TestBed.inject(HoldingChanges).lastTouched()).toBeNull();
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

  it('emits sold once, only after the exit has played', async () => {
    const user = userEvent.setup();
    await renderDialog();
    const dialog = slowDialogExit();

    await user.type(screen.getByTestId('holding-sell-quantity'), '100');
    await user.click(screen.getByTestId('holding-sell-submit'));
    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/sell'))).flush({ id: 'h1' });

    await vi.waitFor(() => expect(dialog).not.toHaveAttribute('open'));
    expect(sold).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(sold).toHaveBeenCalledTimes(1));
    expect(dismissed).not.toHaveBeenCalled();
  });

  it('emits dismissed once, after the exit, when Annuler is clicked', async () => {
    const user = userEvent.setup();
    await renderDialog();
    const dialog = slowDialogExit();

    await user.click(screen.getByTestId('holding-sell-cancel'));

    await vi.waitFor(() => expect(dialog).not.toHaveAttribute('open'));
    expect(dismissed).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(dismissed).toHaveBeenCalledTimes(1));
    expect(sold).not.toHaveBeenCalled();
  });

  it('emits dismissed once, after the exit, when the reader closes the dialog', async () => {
    await renderDialog();
    const dialog = slowDialogExit();

    dialog.close();

    expect(dismissed).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(dismissed).toHaveBeenCalledTimes(1));
    expect(sold).not.toHaveBeenCalled();
  });

  it('never calls the server when confirm is invoked while invalid', async () => {
    const { fixture } = await render(HoldingSellDialog, {
      inputs: { holding },
      on: { sold, dismissed },
      imports: [getTranslocoTestingModule()],
      providers: [
        HoldingChanges,
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

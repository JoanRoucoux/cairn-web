import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, type Provider, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { UiToasts } from '@joanroucoux/cairn-ui/toast';
import { TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { type RenderResult, fireEvent, render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { slowDialogExit } from '@shared/testing/dialog-exit';
import { expectSubmitting } from '@shared/testing/submitting';
import { delayedScopeLoader, getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingChanges } from '../../holding-changes';
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

  const renderDialog = async (
    input: HoldingResponse = holding,
    extraProviders: Provider[] = [],
  ): Promise<RenderResult<HoldingBuyDialog>> => {
    const result = await render(HoldingBuyDialog, {
      inputs: { holding: input },
      on: { bought, dismissed },
      imports: [getTranslocoTestingModule()],
      providers: [
        HoldingChanges,
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'en-GB' },
        provideTranslocoScope('holdings'),
        ...extraProviders,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);

    return result;
  };

  afterEach(() => {
    httpTesting.verify();
    bought.mockClear();
    dismissed.mockClear();
  });

  it('does not translate its holdings scope keys before the scope has loaded', async () => {
    const translate = vi.spyOn(TranslocoService.prototype, 'translate');
    await renderDialog(holding, [delayedScopeLoader()]);

    expect(translate.mock.calls.filter(([key]) => String(key).startsWith('holdings.buy.submit'))).toEqual([]);

    translate.mockRestore();
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

  it('submits the form', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('holding-buy-quantity'), '5');
    await user.type(screen.getByTestId('holding-buy-price'), '10');
    await vi.waitFor(() => expect(screen.getByTestId('holding-buy-submit')).toBeEnabled());
    fireEvent.submit(screen.getByTestId('holding-buy-quantity').closest('form')!);

    const request = await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/buy'));
    expect(request.request.body).toEqual({ quantity: 5, unitPrice: 10 });
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
    slowDialogExit();

    await user.click(screen.getByTestId('holding-buy-cancel'));

    expect(dismissed).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(dismissed).toHaveBeenCalledTimes(1));
  });

  it('emits dismissed on cancel via the native dialog close', async () => {
    await renderDialog();
    slowDialogExit();

    (screen.getByRole('dialog') as HTMLDialogElement).close();

    expect(dismissed).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(dismissed).toHaveBeenCalledTimes(1));
  });

  it('emits bought once the purchase is saved', async () => {
    const user = userEvent.setup();
    await renderDialog();
    slowDialogExit();

    await user.type(screen.getByTestId('holding-buy-quantity'), '40');
    await user.type(screen.getByTestId('holding-buy-price'), '29.1');
    await user.click(screen.getByTestId('holding-buy-submit'));
    await vi.waitFor(() => expectSubmitting(screen.getByTestId('holding-buy-submit')));

    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/buy'))).flush({ id: 'h1' });

    await vi.waitFor(() => expect(bought).toHaveBeenCalledWith({ id: 'h1' }));
    expect(bought).toHaveBeenCalledTimes(1);
    expect(dismissed).not.toHaveBeenCalled();
  });

  const buy = async (): Promise<void> => {
    const user = userEvent.setup();

    await user.type(screen.getByTestId('holding-buy-quantity'), '40');
    await user.type(screen.getByTestId('holding-buy-price'), '29.1');
    await user.click(screen.getByTestId('holding-buy-submit'));
    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/buy'))).flush({ id: 'h1' });
  };

  it('reports the purchase at once, then confirms and reveals it once the exit has played', async () => {
    await renderDialog();
    slowDialogExit();
    const changes = TestBed.inject(HoldingChanges);
    const touched = vi.spyOn(changes, 'touched');
    const show = vi.spyOn(TestBed.inject(UiToasts), 'show');

    await buy();

    await vi.waitFor(() => expect(touched).toHaveBeenCalledExactlyOnceWith('h1'));
    expect(show).not.toHaveBeenCalled();
    expect(changes.lastRevealed()).toBeNull();

    await vi.waitFor(() => expect(bought).toHaveBeenCalledOnce());
    expect(show).toHaveBeenCalledExactlyOnceWith('holdings.toasts.bought');
    expect(changes.lastRevealed()).toBe(changes.lastTouched());
  });

  it('still confirms a purchase, once, when the dialog is destroyed before its exit ends', async () => {
    const { fixture } = await renderDialog();
    slowDialogExit();
    const changes = TestBed.inject(HoldingChanges);
    const touched = vi.spyOn(changes, 'touched');
    const show = vi.spyOn(TestBed.inject(UiToasts), 'show');

    await buy();
    await vi.waitFor(() => expect(touched).toHaveBeenCalledOnce());
    fixture.destroy();

    expect(show).toHaveBeenCalledExactlyOnceWith('holdings.toasts.bought');
    expect(changes.lastRevealed()).toBe(changes.lastTouched());
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(touched).toHaveBeenCalledOnce();
    expect(show).toHaveBeenCalledOnce();
    expect(bought).not.toHaveBeenCalled();
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

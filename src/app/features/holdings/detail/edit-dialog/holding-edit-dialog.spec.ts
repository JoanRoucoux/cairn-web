import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { slowDialogExit } from '@shared/testing/dialog-exit';
import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingChanges } from '../../holding-changes';
import { HoldingEditDialog } from './holding-edit-dialog';

const holding = {
  id: 'h1',
  instrumentName: 'BNP Paribas Easy S&P 500',
  accountName: 'Saxo Investor',
  quantity: 676,
  averageCost: 26.654,
} as unknown as HoldingResponse;

describe('HoldingEditDialog', () => {
  let httpTesting: HttpTestingController;
  const savedForm = vi.fn();
  const dismissed = vi.fn();

  const renderDialog = async (): Promise<void> => {
    await render(HoldingEditDialog, {
      inputs: { holding },
      on: { savedForm, dismissed },
      imports: [getTranslocoTestingModule()],
      providers: [
        HoldingChanges,
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
    savedForm.mockClear();
    dismissed.mockClear();
  });

  it('prefills the quantity and average cost', async () => {
    await renderDialog();

    expect(screen.getByTestId('holding-edit-quantity')).toHaveValue(676);
    expect(screen.getByTestId('holding-edit-average-cost')).toHaveValue(26.654);
  });

  it('emits dismissed on cancel', async () => {
    const user = userEvent.setup();
    await renderDialog();
    slowDialogExit();

    await user.click(screen.getByTestId('holding-edit-cancel'));

    expect(dismissed).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(dismissed).toHaveBeenCalledTimes(1));
  });

  it('saves the change and emits savedForm', async () => {
    const user = userEvent.setup();
    await renderDialog();
    slowDialogExit();

    await user.clear(screen.getByTestId('holding-edit-quantity'));
    await user.type(screen.getByTestId('holding-edit-quantity'), '700');
    await user.click(screen.getByTestId('holding-edit-submit'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1'))).flush({ id: 'h1' });

    await vi.waitFor(() => expect(savedForm).toHaveBeenCalledWith({ id: 'h1' }));
    expect(savedForm).toHaveBeenCalledTimes(1);
    expect(dismissed).not.toHaveBeenCalled();
  });

  it('emits dismissed when the native dialog closes', async () => {
    await renderDialog();
    slowDialogExit();

    (screen.getByRole('dialog') as HTMLDialogElement).close();

    expect(dismissed).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(dismissed).toHaveBeenCalledTimes(1));
  });

  it('refuses an empty quantity before it ever reaches the API', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.clear(screen.getByTestId('holding-edit-quantity'));
    await user.click(screen.getByTestId('holding-edit-submit'));

    expect(screen.getByTestId('holding-edit-quantity')).toBeInvalid();
    httpTesting.expectNone('/api/holdings/h1');
  });

  it('refuses a negative quantity before it ever reaches the API', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.clear(screen.getByTestId('holding-edit-quantity'));
    await user.type(screen.getByTestId('holding-edit-quantity'), '-5');
    await user.click(screen.getByTestId('holding-edit-submit'));

    expect(screen.getByTestId('holding-edit-quantity')).toBeInvalid();
    httpTesting.expectNone('/api/holdings/h1');
  });

  it('refuses a negative average cost before it ever reaches the API', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.clear(screen.getByTestId('holding-edit-average-cost'));
    await user.type(screen.getByTestId('holding-edit-average-cost'), '-5');
    await user.click(screen.getByTestId('holding-edit-submit'));

    expect(screen.getByTestId('holding-edit-average-cost')).toBeInvalid();
    httpTesting.expectNone('/api/holdings/h1');
  });

  it('shows a generic error when the API refuses', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.click(screen.getByTestId('holding-edit-submit'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1'))).flush(null, {
      status: 500,
      statusText: 'Server error',
    });

    expect(await screen.findByTestId('holding-edit-error')).toBeInTheDocument();
    expect(savedForm).not.toHaveBeenCalled();
  });
});

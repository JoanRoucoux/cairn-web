import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingChanges } from '../../holding-changes';
import { HoldingCashDialog } from './holding-cash-dialog';

describe('HoldingCashDialog', () => {
  let httpTesting: HttpTestingController;
  const saved = vi.fn();
  const dismissed = vi.fn();

  const renderDialog = async (balance = 0, savings = false): Promise<void> => {
    await render(HoldingCashDialog, {
      inputs: { accountId: 'account-1', accountName: 'Saxo Investor', balance, savings },
      on: { saved, dismissed },
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

  it('should prefill the amount field with the current balance', async () => {
    await renderDialog(732.4);

    expect(screen.getByTestId('holding-cash-amount')).toHaveValue(732.4);
  });

  it('should refuse a negative amount', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.clear(screen.getByTestId('holding-cash-amount'));
    await user.type(screen.getByTestId('holding-cash-amount'), '-10');
    await user.click(screen.getByTestId('holding-cash-submit'));

    expect(screen.getByTestId('holding-cash-amount')).toBeInvalid();
    expect(saved).not.toHaveBeenCalled();
  });

  it('should hint that zero removes the line', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.clear(screen.getByTestId('holding-cash-amount'));
    await user.type(screen.getByTestId('holding-cash-amount'), '0');

    expect(await screen.findByText('holdings.cash.zeroHint')).toBeInTheDocument();
  });

  it('should title the dialog with the balance and drop the zero hint for a savings account', async () => {
    const user = userEvent.setup();
    await renderDialog(0, true);

    await user.clear(screen.getByTestId('holding-cash-amount'));
    await user.type(screen.getByTestId('holding-cash-amount'), '0');

    expect(screen.getByRole('dialog')).toHaveTextContent('holdings.balance.title');
    expect(screen.queryByText('holdings.cash.zeroHint')).not.toBeInTheDocument();
  });

  it('should title the dialog with the cash of a securities account', async () => {
    await renderDialog();

    expect(screen.getByRole('dialog')).toHaveTextContent('holdings.cash.title');
  });

  it('should report the change once the balance has been set', async () => {
    const user = userEvent.setup();
    await renderDialog();
    const changes = TestBed.inject(HoldingChanges);

    await user.type(screen.getByTestId('holding-cash-amount'), '250');
    await user.click(screen.getByTestId('holding-cash-submit'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/accounts/account-1/cash'))).flush(null, {
      status: 204,
      statusText: 'No Content',
    });

    await vi.waitFor(() => expect(changes.lastTouched()).toMatchObject({ id: 'account-1' }));
  });

  it('should emit saved once the balance has been set', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('holding-cash-amount'), '250');
    await user.click(screen.getByTestId('holding-cash-submit'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/accounts/account-1/cash'))).flush(null, {
      status: 204,
      statusText: 'No Content',
    });

    await vi.waitFor(() => expect(saved).toHaveBeenCalled());
  });

  it('should show a generic error when the API refuses', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('holding-cash-amount'), '250');
    await user.click(screen.getByTestId('holding-cash-submit'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/accounts/account-1/cash'))).flush(null, {
      status: 500,
      statusText: 'Server error',
    });

    expect(await screen.findByTestId('holding-cash-error')).toBeInTheDocument();
    expect(saved).not.toHaveBeenCalled();
  });
});

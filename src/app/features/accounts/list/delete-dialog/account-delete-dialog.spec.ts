import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { slowDialogExit } from '@shared/testing/dialog-exit';
import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import type { AccountView } from '../account-list-store';
import { AccountDeleteDialog } from './account-delete-dialog';

const account: AccountView = {
  id: 'a1',
  name: 'PEA Boursorama',
  type: 'PEA',
  institution: 'Boursorama',
  valueEur: 1000,
  share: null,
  lineCount: 3,
};

describe('AccountDeleteDialog', () => {
  let httpTesting: HttpTestingController;
  const deleted = vi.fn();
  const dismissed = vi.fn();

  const renderDialog = async (): Promise<void> => {
    await render(AccountDeleteDialog, {
      inputs: { account },
      on: { deleted, dismissed },
      imports: [
        getTranslocoTestingModule({
          langs: {
            'accounts/en': { delete: { refused_one: '{{count}} line held', refused_other: '{{count}} lines held' } },
          },
        }),
      ],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslocoScope('accounts'),
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
  };

  afterEach(() => {
    httpTesting.verify();
    deleted.mockClear();
    dismissed.mockClear();
  });

  it('should emit dismissed on cancel', async () => {
    const user = userEvent.setup();
    await renderDialog();
    slowDialogExit();

    await user.click(screen.getByTestId('account-delete-cancel'));

    expect(dismissed).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(dismissed).toHaveBeenCalledTimes(1));
  });

  it('should emit dismissed when the native dialog closes', async () => {
    await renderDialog();
    slowDialogExit();

    (screen.getByRole('alertdialog') as HTMLDialogElement).close();

    expect(dismissed).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(dismissed).toHaveBeenCalledTimes(1));
  });

  it('should emit deleted once the account is removed', async () => {
    const user = userEvent.setup();
    await renderDialog();
    slowDialogExit();

    await user.click(screen.getByTestId('account-delete-confirm'));

    await vi.waitFor(() => httpTesting.expectOne('/api/accounts/a1').flush(null));
    await vi.waitFor(() => expect(deleted).toHaveBeenCalledTimes(1));
    expect(dismissed).not.toHaveBeenCalled();
  });

  it('keeps the dialog open with the line count from the view model on a 422', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.click(screen.getByTestId('account-delete-confirm'));

    await vi.waitFor(() =>
      httpTesting.expectOne('/api/accounts/a1').flush(null, { status: 422, statusText: 'Unprocessable' }),
    );

    expect(await screen.findByTestId('account-delete-refused')).toHaveTextContent('3');
    expect(deleted).not.toHaveBeenCalled();
  });

  it('keeps the dialog open with a generic error on any other failure', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.click(screen.getByTestId('account-delete-confirm'));

    await vi.waitFor(() =>
      httpTesting.expectOne('/api/accounts/a1').flush(null, { status: 500, statusText: 'Server Error' }),
    );

    expect(await screen.findByTestId('account-delete-error')).toBeInTheDocument();
    expect(deleted).not.toHaveBeenCalled();
  });
});

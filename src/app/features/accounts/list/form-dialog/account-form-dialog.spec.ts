import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { UiToasts } from '@joanroucoux/cairn-ui/toast';
import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { slowDialogExit } from '@shared/testing/dialog-exit';
import { expectSubmitting } from '@shared/testing/submitting';
import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { AccountFormDialog, type AccountFormTarget } from './account-form-dialog';

describe('AccountFormDialog', () => {
  let httpTesting: HttpTestingController;
  const savedForm = vi.fn();
  const dismissed = vi.fn();

  const renderDialog = async (account?: AccountFormTarget): Promise<void> => {
    await render(AccountFormDialog, {
      inputs: { account },
      on: { savedForm, dismissed },
      imports: [getTranslocoTestingModule()],
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
    savedForm.mockClear();
    dismissed.mockClear();
  });

  it('should show the create title with no account', async () => {
    await renderDialog();

    expect(await screen.findByText('accounts.form.createTitle')).toBeInTheDocument();
  });

  it('should show the edit title and the prefilled draft with an existing account', async () => {
    await renderDialog({ id: 'a1', name: 'Northwind PEA', type: 'PEA', institution: 'Northwind Bank' });

    expect(await screen.findByText('accounts.form.editTitle')).toBeInTheDocument();
    expect(screen.getByTestId('account-form-name')).toHaveValue('Northwind PEA');
  });

  it('should emit dismissed on cancel', async () => {
    const user = userEvent.setup();
    await renderDialog();
    slowDialogExit();

    await user.click(screen.getByTestId('account-form-cancel'));

    expect(dismissed).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(dismissed).toHaveBeenCalledTimes(1));
  });

  it('should emit dismissed when the native dialog closes', async () => {
    await renderDialog();
    slowDialogExit();

    (screen.getByRole('dialog') as HTMLDialogElement).close();

    expect(dismissed).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(dismissed).toHaveBeenCalledTimes(1));
  });

  it('keeps the submit disabled until a name and an envelope are set, and names a missing field once it is left', async () => {
    const user = userEvent.setup();
    await renderDialog();

    expect(screen.getByTestId('account-form-submit')).toBeDisabled();

    await user.click(screen.getByTestId('account-form-name'));
    await user.tab();

    expect(await screen.findByRole('alert')).toBeInTheDocument();

    await user.type(screen.getByTestId('account-form-name'), 'PEA');
    await user.click(screen.getByRole('radio', { name: 'enums.accountType.PEA' }));

    expect(screen.getByTestId('account-form-submit')).toBeEnabled();
  });

  it('offers the seven envelopes as radio chips, and the dormant PEA-PME one only when editing it', async () => {
    await renderDialog();

    expect(screen.getAllByRole('radio').map((chip) => chip.textContent?.trim())).toEqual([
      'enums.accountType.PEA',
      'enums.accountType.PEE',
      'enums.accountType.PER',
      'enums.accountType.CTO',
      'enums.accountType.LIFE_INSURANCE',
      'enums.accountType.CRYPTO',
      'enums.accountType.SAVINGS',
    ]);
  });

  it('keeps the PEA-PME chip for an account of that envelope', async () => {
    await renderDialog({ id: 'a1', name: 'Vieux', type: 'PEA_PME', institution: 'X' });

    expect(screen.getByRole('radio', { name: 'enums.accountType.PEA_PME' })).toBeChecked();
  });

  it('opens with PEA selected and enables creation as soon as a name is typed', async () => {
    const user = userEvent.setup();
    await renderDialog();

    expect(screen.getByRole('radio', { name: 'enums.accountType.PEA' })).toBeChecked();
    expect(screen.getByTestId('account-form-submit')).toBeDisabled();

    await user.type(screen.getByTestId('account-form-name'), 'Northwind Bank');

    expect(screen.getByTestId('account-form-submit')).toBeEnabled();
  });

  it('creates without an institution, and labels the actions for each mode', async () => {
    const user = userEvent.setup();
    await renderDialog();

    expect(screen.getByTestId('account-form-submit')).toHaveTextContent('accounts.form.create');
    await user.type(screen.getByTestId('account-form-name'), 'Contoso Trading');
    await user.click(screen.getByRole('radio', { name: 'enums.accountType.CTO' }));
    await user.type(screen.getByTestId('account-form-institution'), '   ');
    await user.click(screen.getByTestId('account-form-submit'));

    const request = await vi.waitFor(() => httpTesting.expectOne('/api/accounts'));
    expect(request.request.body).toEqual({ name: 'Contoso Trading', type: 'CTO', institution: '' });
    request.flush({ id: 'a3' });
  });

  it('labels the primary action Save when editing', async () => {
    await renderDialog({ id: 'a1', name: 'PEA', type: 'PEA', institution: 'Northwind Bank' });

    expect(screen.getByTestId('account-form-submit')).toHaveTextContent('accounts.form.submit');
  });

  it('should emit savedForm with the saved account once it is accepted', async () => {
    const user = userEvent.setup();
    await renderDialog();
    slowDialogExit();

    await user.type(screen.getByTestId('account-form-name'), 'Northwind PEA');
    await user.click(screen.getByRole('radio', { name: 'enums.accountType.PEA' }));
    await user.type(screen.getByTestId('account-form-institution'), 'Northwind Bank');
    await user.click(screen.getByTestId('account-form-submit'));
    await vi.waitFor(() => expectSubmitting(screen.getByTestId('account-form-submit')));

    await vi.waitFor(() => httpTesting.expectOne('/api/accounts').flush({ id: 'a3' }));
    await vi.waitFor(() => expect(savedForm).toHaveBeenCalledExactlyOnceWith('a3'));
    expect(TestBed.inject(UiToasts).toast()).toBeNull();
    expect(dismissed).not.toHaveBeenCalled();
  });

  it('should show a field error on the name, not a generic failure, on a 409', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('account-form-name'), 'Northwind PEA');
    await user.click(screen.getByRole('radio', { name: 'enums.accountType.PEA' }));
    await user.type(screen.getByTestId('account-form-institution'), 'Northwind Bank');
    await user.click(screen.getByTestId('account-form-submit'));

    await vi.waitFor(() => httpTesting.expectOne('/api/accounts').flush(null, { status: 409, statusText: 'Conflict' }));

    expect(await screen.findByText('accounts.form.nameConflict')).toBeInTheDocument();
    expect(screen.queryByTestId('account-form-error')).not.toBeInTheDocument();
    expect(savedForm).not.toHaveBeenCalled();
  });

  it('should keep the dialog open with a field error on the envelope, and no toast, on a 422', async () => {
    const user = userEvent.setup();
    await renderDialog({ id: 'a1', name: 'Northwind PEA', type: 'PEA', institution: '' });

    await user.click(screen.getByRole('radio', { name: 'enums.accountType.SAVINGS' }));
    await user.click(screen.getByTestId('account-form-submit'));

    await vi.waitFor(() =>
      httpTesting.expectOne('/api/accounts/a1').flush(null, { status: 422, statusText: 'Unprocessable Entity' }),
    );

    expect(await screen.findByText('accounts.form.savingsConflict')).toBeInTheDocument();
    expect(screen.queryByTestId('account-form-error')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAttribute('open');
    expect(TestBed.inject(UiToasts).toast()).toBeNull();
    expect(savedForm).not.toHaveBeenCalled();
    expect(dismissed).not.toHaveBeenCalled();
  });

  it('should clear the envelope error once another type is chosen', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('account-form-name'), 'Northwind PEA');
    await user.click(screen.getByRole('radio', { name: 'enums.accountType.PEA' }));
    await user.click(screen.getByTestId('account-form-submit'));
    await vi.waitFor(() =>
      httpTesting.expectOne('/api/accounts').flush(null, { status: 422, statusText: 'Unprocessable Entity' }),
    );
    await screen.findByText('accounts.form.savingsConflict');

    await user.click(screen.getByRole('radio', { name: 'enums.accountType.PEE' }));

    expect(screen.queryByText('accounts.form.savingsConflict')).not.toBeInTheDocument();
  });

  it('should clear the name conflict once the name is edited again', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('account-form-name'), 'Northwind PEA');
    await user.click(screen.getByRole('radio', { name: 'enums.accountType.PEA' }));
    await user.type(screen.getByTestId('account-form-institution'), 'Northwind Bank');
    await user.click(screen.getByTestId('account-form-submit'));
    await vi.waitFor(() => httpTesting.expectOne('/api/accounts').flush(null, { status: 409, statusText: 'Conflict' }));
    await screen.findByText('accounts.form.nameConflict');

    await user.type(screen.getByTestId('account-form-name'), ' bis');

    expect(screen.queryByText('accounts.form.nameConflict')).not.toBeInTheDocument();
  });

  it('should stay open and show a generic error on any other failure', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('account-form-name'), 'Northwind PEA');
    await user.click(screen.getByRole('radio', { name: 'enums.accountType.PEA' }));
    await user.type(screen.getByTestId('account-form-institution'), 'Northwind Bank');
    await user.click(screen.getByTestId('account-form-submit'));

    await vi.waitFor(() =>
      httpTesting.expectOne('/api/accounts').flush(null, { status: 500, statusText: 'Server Error' }),
    );

    expect(await screen.findByTestId('account-form-error')).toBeInTheDocument();
    expect(savedForm).not.toHaveBeenCalled();
  });
});

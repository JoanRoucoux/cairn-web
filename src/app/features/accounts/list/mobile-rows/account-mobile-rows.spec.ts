import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import type { AccountView } from '../account-list-store';
import { AccountMobileRows } from './account-mobile-rows';

const account: AccountView = {
  id: 'a1',
  name: 'Livret',
  type: 'SAVINGS',
  institution: '',
  valueEur: 0,
  share: null,
  lineCount: 0,
};

describe('AccountMobileRows', () => {
  const edit = vi.fn();
  const remove = vi.fn();

  const renderRows = async (): Promise<void> => {
    await render(AccountMobileRows, {
      inputs: { accounts: [account] },
      on: { edit, remove },
      imports: [getTranslocoTestingModule()],
      providers: [provideZonelessChangeDetection(), provideRouter([]), provideTranslocoScope('accounts')],
    });
  };

  afterEach(() => {
    edit.mockClear();
    remove.mockClear();
  });

  it('should show a row with no separator for a blank institution, and the empty hint', async () => {
    await renderRows();

    expect(screen.getByTestId('account-row-mobile')).not.toHaveTextContent('·');
    expect(screen.getByTestId('account-empty-add-mobile')).toHaveAttribute('href', '/holdings?add=a1');
  });

  it('should emit the account from the row menu', async () => {
    const user = userEvent.setup();
    await renderRows();

    await user.click(screen.getByTestId('account-menu-trigger-mobile'));
    await user.click(screen.getByTestId('account-edit-mobile'));
    await user.click(screen.getByTestId('account-menu-trigger-mobile'));
    await user.click(screen.getByTestId('account-delete-mobile'));

    expect(edit).toHaveBeenCalledWith(account);
    expect(remove).toHaveBeenCalledWith(account);
  });
});

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
  unvaluedCount: 0,
  nonEurCount: 0,
  excludedLineId: null,
};

describe('AccountMobileRows', () => {
  const edit = vi.fn();
  const remove = vi.fn();

  const renderRows = async (accounts: AccountView[] = [account]): Promise<void> => {
    await render(AccountMobileRows, {
      inputs: { accounts },
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

  it('should say nothing about lines left out when there are none', async () => {
    await renderRows();

    expect(screen.queryByTestId('account-uncounted-mobile')).not.toBeInTheDocument();
  });

  it('should name the unpriced lines left out inside the row link, without a link of its own', async () => {
    await renderRows([{ ...account, lineCount: 5, unvaluedCount: 2, excludedLineId: null }]);

    const caption = screen.getByTestId('account-uncounted-mobile');

    expect(caption).toHaveTextContent('accounts.uncounted.noQuote_other');
    expect(caption.closest('a')).toBe(screen.getByTestId('account-link-mobile'));
    expect(caption.querySelector('a')).toBeNull();
  });

  it('should name the non-EUR lines left out, apart from the unpriced ones', async () => {
    await renderRows([{ ...account, lineCount: 2, unvaluedCount: 1, nonEurCount: 1 }]);

    const captions = screen.getAllByTestId('account-uncounted-mobile');

    expect(captions.map((caption) => caption.textContent?.trim())).toEqual([
      'accounts.uncounted.noQuote_one',
      'accounts.uncounted.nonEur_one',
    ]);
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

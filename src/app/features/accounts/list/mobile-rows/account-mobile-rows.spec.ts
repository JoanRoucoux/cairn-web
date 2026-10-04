import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
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
  type: 'PEA',
  institution: '',
  valueEur: 0,
  share: null,
  lineCount: 0,
  unvaluedCount: 0,
  nonEurCount: 0,
  excludedLineId: null,
  balanceAt: null,
  empty: true,
};

const savings: AccountView = { ...account, id: 'a2', name: 'Livret A', type: 'SAVINGS', empty: false };

describe('AccountMobileRows', () => {
  const edit = vi.fn();
  const remove = vi.fn();

  const renderRows = async (
    accounts: AccountView[] = [account],
    langs: Record<string, Record<string, string>> = {},
  ): Promise<void> => {
    await render(AccountMobileRows, {
      inputs: { accounts },
      on: { edit, remove },
      imports: [getTranslocoTestingModule({ langs: { en: {}, 'accounts/en': {}, ...langs } })],
      providers: [
        provideZonelessChangeDetection(),
        { provide: LOCALE_ID, useValue: 'fr-FR' },
        provideRouter([]),
        provideTranslocoScope('accounts'),
      ],
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
    await renderRows([{ ...account, lineCount: 5, unvaluedCount: 2, excludedLineId: null, empty: false }]);

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

  it('should offer no empty hint on an account that holds its cash', async () => {
    await renderRows([{ ...account, empty: false }]);

    expect(screen.queryByTestId('account-empty-hint-mobile')).not.toBeInTheDocument();
  });

  it('should show the balance date of a savings account instead of a line count, from the Paris date', async () => {
    await renderRows([{ ...savings, balanceAt: '2026-09-12T22:30:00Z' }], {
      'accounts/en': { balanceAt: 'Balance as of {{date}}' },
    });

    expect(screen.getByTestId('account-lines-mobile')).toHaveTextContent('Balance as of 13/09');
    expect(screen.getByTestId('account-row-mobile')).not.toHaveTextContent('accounts.noLine');
  });

  it('should show neither a date nor a line count for a savings balance never set', async () => {
    await renderRows([savings]);

    expect(screen.queryByTestId('account-lines-mobile')).not.toBeInTheDocument();
    expect(screen.getByTestId('account-row-mobile')).not.toHaveTextContent('accounts.noLine');
    expect(screen.queryByTestId('account-empty-hint-mobile')).not.toBeInTheDocument();
  });

  it('should keep the balance out of the menu of a savings account', async () => {
    const user = userEvent.setup();
    await renderRows([savings]);

    await user.click(screen.getByTestId('account-menu-trigger-mobile'));

    expect(
      [...document.querySelectorAll('ui-menu button[uiMenuItem]')].map((item) => item.getAttribute('data-testid')),
    ).toEqual(['account-edit-mobile', 'account-delete-mobile']);
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { AccountListPage } from './account-list-page';
import { AccountListStore } from './account-list-store';

const boursorama = { id: 'a1', name: 'PEA Boursorama', type: 'PEA', institution: 'Boursorama' };
const livretA = { id: 'a2', name: 'Livret A', type: 'SAVINGS', institution: 'Fortuneo' };

describe('AccountListPage savings accounts', () => {
  let httpTesting: HttpTestingController;

  const renderPage = async (accounts: unknown[], holdings: unknown[]): Promise<void> => {
    await render(AccountListPage, {
      imports: [
        getTranslocoTestingModule({ langs: { en: {}, 'accounts/en': { balanceAt: 'Balance as of {{date}}' } } }),
      ],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'holdings', children: [] }]),
        { provide: LOCALE_ID, useValue: 'fr-FR' },
        provideTranslocoScope('accounts'),
        AccountListStore,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.expectOne('/api/accounts').flush(accounts);
    httpTesting
      .expectOne('/api/portfolio')
      .flush({ totalEur: 1500, unvaluedCount: 0, nonEurCount: 0, byAssetClass: [], byAccount: [], holdings });
  };

  afterEach(() => httpTesting.verify());

  const cash = {
    accountId: 'a2',
    assetClass: 'CASH',
    priceSource: 'MANUAL',
    priceCurrency: 'EUR',
    accountCash: true,
    marketValueEur: 500,
    updatedAt: '2026-09-12T08:00:00Z',
  };

  it('should show the balance date in the count slot, never a line count nor the empty panel', async () => {
    await renderPage([livretA], [cash]);

    const row = await screen.findByTestId('account-row');

    expect(screen.getByTestId('account-lines')).toHaveTextContent('Balance as of 12/09');
    expect(row).not.toHaveTextContent(/lineCount|noLine/);
    expect(screen.queryByTestId('account-empty-hint')).not.toBeInTheDocument();
  });

  it('should show 0,00 and no date for a balance never set, and still no empty panel', async () => {
    await renderPage([livretA], []);

    const row = await screen.findByTestId('account-row');

    expect(row).toHaveTextContent('0,00');
    expect(screen.queryByTestId('account-lines')).not.toBeInTheDocument();
    expect(row).not.toHaveTextContent(/lineCount|noLine/);
    expect(screen.queryByTestId('account-empty-hint')).not.toBeInTheDocument();
  });

  it('should offer to edit the balance from the menu and lead to Lignes on that account', async () => {
    const user = userEvent.setup();
    await renderPage([livretA, boursorama], [cash]);

    const [trigger] = await screen.findAllByTestId('account-menu-trigger');
    await user.click(trigger!);
    await user.click(screen.getByTestId('account-edit-balance'));

    expect(TestBed.inject(Router).url).toBe('/holdings?balance=a2');
  });

  it('should lead to Lignes on that account from the iPhone menu too', async () => {
    const user = userEvent.setup();
    await renderPage([livretA], [cash]);

    await user.click(await screen.findByTestId('account-menu-trigger-mobile'));
    await user.click(screen.getByTestId('account-edit-balance-mobile'));

    expect(TestBed.inject(Router).url).toBe('/holdings?balance=a2');
  });

  it('should offer the balance edit on no other account', async () => {
    const user = userEvent.setup();
    await renderPage([boursorama], []);

    await user.click(await screen.findByTestId('account-menu-trigger'));

    expect(screen.queryByTestId('account-edit-balance')).not.toBeInTheDocument();
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { AccountListPage } from './account-list-page';
import { AccountListStore } from './account-list-store';

const northwind = { id: 'a1', name: 'Northwind PEA', type: 'PEA', institution: 'Northwind Bank' };
const livretA = { id: 'a2', name: 'Livret A', type: 'SAVINGS', institution: 'Woodgrove Bank' };

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

  it('should keep the balance out of the menu of a savings account, desktop and iPhone', async () => {
    const user = userEvent.setup();
    await renderPage([livretA, northwind], [cash]);

    await user.click((await screen.findAllByTestId('account-menu-trigger'))[0]!);
    await user.click((await screen.findAllByTestId('account-menu-trigger-mobile'))[0]!);

    expect(screen.getAllByTestId(/^account-edit/)).not.toHaveLength(0);
    expect(screen.queryByTestId('account-edit-balance')).not.toBeInTheDocument();
    expect(screen.queryByTestId('account-edit-balance-mobile')).not.toBeInTheDocument();
  });
});

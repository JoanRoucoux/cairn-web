import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { AccountListPage } from './account-list-page';
import { AccountListStore } from './account-list-store';

const boursorama = { id: 'a1', name: 'PEA Boursorama', type: 'PEA', institution: 'Boursorama' };
const livretA = { id: 'a2', name: 'Livret A', type: 'SAVINGS', institution: 'Fortuneo' };

describe('AccountListPage', () => {
  let httpTesting: HttpTestingController;

  const renderPage = async (
    accounts: unknown[] = [boursorama, livretA],
    holdings: unknown[] = [
      { accountId: 'a1', assetClass: 'ETF', priceSource: 'YAHOO', priceCurrency: 'EUR', marketValueEur: 1000 },
      { accountId: 'a2', assetClass: 'CASH', priceSource: 'MANUAL', priceCurrency: 'EUR', marketValueEur: 500 },
    ],
  ): Promise<void> => {
    await render(AccountListPage, {
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideTranslocoScope('accounts'),
        AccountListStore,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.expectOne('/api/accounts').flush(accounts);
    httpTesting.expectOne('/api/portfolio').flush({ byAssetClass: [], byAccount: [], holdings });
  };

  afterEach(() => httpTesting.verify());

  it('should render every account with its value and line count', async () => {
    await renderPage();

    expect(await screen.findByText('PEA Boursorama')).toBeInTheDocument();
    expect(screen.getAllByText('accounts.lineCount')).not.toHaveLength(0);
  });

  it('should show the empty-account hint for an account with only its cash balance', async () => {
    await renderPage();

    expect(await screen.findByText('accounts.rowEmpty')).toBeInTheDocument();
  });

  it('should open the create dialog from the add button', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByTestId('account-add'));

    expect(await screen.findByTestId('account-form-dialog')).toBeInTheDocument();
  });

  it('should close the form dialog without reloading when it is dismissed', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByTestId('account-add'));
    await user.click(await screen.findByTestId('account-form-cancel'));

    expect(screen.queryByTestId('account-form-dialog')).not.toBeInTheDocument();
    httpTesting.expectNone('/api/accounts');
  });

  it('should open the edit dialog prefilled from the row menu', async () => {
    const user = userEvent.setup();
    await renderPage([boursorama], []);

    await user.click(await screen.findByTestId('account-menu-trigger'));
    await user.click(screen.getByTestId('account-edit'));

    expect(await screen.findByTestId('account-form-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('account-form-name')).toHaveValue('PEA Boursorama');
  });

  it('should reload the list once the form is saved', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByTestId('account-add'));
    await user.type(screen.getByTestId('account-form-name'), 'CTO Bourso');
    await user.selectOptions(screen.getByTestId('account-form-type'), 'CTO');
    await user.type(screen.getByTestId('account-form-institution'), 'Boursorama');
    await user.click(screen.getByTestId('account-form-submit'));

    await vi.waitFor(() => httpTesting.expectOne('/api/accounts').flush({ ...boursorama, id: 'a3' }));

    await vi
      .waitFor(() => httpTesting.expectOne('/api/accounts'))
      .then((request) => request.flush([boursorama, livretA]));
    await vi
      .waitFor(() => httpTesting.expectOne('/api/portfolio'))
      .then((request) => request.flush({ byAssetClass: [], byAccount: [], holdings: [] }));
  });

  it('should open the delete dialog from the row menu and reload once confirmed', async () => {
    const user = userEvent.setup();
    await renderPage([boursorama], []);

    await user.click(await screen.findByTestId('account-menu-trigger'));
    await user.click(screen.getByTestId('account-delete'));

    expect(await screen.findByTestId('account-delete-dialog')).toBeInTheDocument();

    await user.click(screen.getByTestId('account-delete-confirm'));
    await vi.waitFor(() => httpTesting.expectOne('/api/accounts/a1').flush(null));

    await vi.waitFor(() => httpTesting.expectOne('/api/accounts')).then((request) => request.flush([livretA]));
    await vi
      .waitFor(() => httpTesting.expectOne('/api/portfolio'))
      .then((request) => request.flush({ byAssetClass: [], byAccount: [], holdings: [] }));
  });

  it('should dismiss the delete dialog without deleting anything', async () => {
    const user = userEvent.setup();
    await renderPage([boursorama], []);

    await user.click(await screen.findByTestId('account-menu-trigger'));
    await user.click(screen.getByTestId('account-delete'));
    await user.click(await screen.findByTestId('account-delete-cancel'));

    expect(screen.queryByTestId('account-delete-dialog')).not.toBeInTheDocument();
    httpTesting.expectNone('/api/accounts/a1');
  });

  it('should show an error message with a retry when a call fails', async () => {
    const user = userEvent.setup();
    await render(AccountListPage, {
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideTranslocoScope('accounts'),
        AccountListStore,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.expectOne('/api/accounts').flush(null, { status: 500, statusText: 'Server Error' });
    httpTesting.expectOne('/api/portfolio').flush({ byAssetClass: [], byAccount: [], holdings: [] });

    expect(await screen.findByRole('alert')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'accounts.retry' }));
    await vi.waitFor(() => httpTesting.expectOne('/api/accounts')).then((request) => request.flush([]));
    await vi
      .waitFor(() => httpTesting.expectOne('/api/portfolio'))
      .then((request) => request.flush({ byAssetClass: [], byAccount: [], holdings: [] }));
  });

  it('should show the empty state when there is no account', async () => {
    await renderPage([], []);

    expect(await screen.findByText('accounts.empty')).toBeInTheDocument();
  });
});

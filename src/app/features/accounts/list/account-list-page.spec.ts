import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { UiToasts } from '@joanroucoux/cairn-ui';
import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen, within } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { AccountListPage } from './account-list-page';
import { AccountListStore } from './account-list-store';

const boursorama = { id: 'a1', name: 'PEA Boursorama', type: 'PEA', institution: 'Boursorama' };
const livretA = { id: 'a2', name: 'Livret A', type: 'SAVINGS', institution: 'Fortuneo' };

describe('AccountListPage', () => {
  let httpTesting: HttpTestingController;

  const totalEur = 1500;

  const renderPage = async (
    accounts: unknown[] = [boursorama, livretA],
    holdings: unknown[] = [
      { accountId: 'a1', assetClass: 'ETF', priceSource: 'YAHOO', priceCurrency: 'EUR', marketValueEur: 1000 },
      {
        accountId: 'a2',
        assetClass: 'CASH',
        priceSource: 'MANUAL',
        priceCurrency: 'EUR',
        accountCash: true,
        marketValueEur: 500,
      },
    ],
  ): Promise<void> => {
    await render(AccountListPage, {
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'fr-FR' },
        provideTranslocoScope('accounts'),
        AccountListStore,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.expectOne('/api/accounts').flush(accounts);
    httpTesting.expectOne('/api/portfolio').flush({ totalEur, byAssetClass: [], byAccount: [], holdings });
  };

  afterEach(() => httpTesting.verify());

  it('should render every account with its value and line count', async () => {
    await renderPage();

    expect((await screen.findAllByText('PEA Boursorama')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/accounts.lineCount_(one|other)/)).not.toHaveLength(0);
  });

  it('should show a summary-shaped skeleton while loading and no summary on error', async () => {
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

    expect(screen.getByTestId('accounts-summary-skeleton')).toBeInTheDocument();

    httpTesting.expectOne('/api/accounts').flush(null, { status: 500, statusText: 'Server Error' });
    httpTesting.expectOne('/api/portfolio').flush({ totalEur: 0, byAssetClass: [], byAccount: [], holdings: [] });

    await screen.findByRole('alert');
    expect(screen.queryByTestId('accounts-summary-skeleton')).not.toBeInTheDocument();
    expect(screen.getByTestId('accounts-summary')).toHaveTextContent('');
  });

  it('should show a blank institution as nothing on the meta line and a dash in the column', async () => {
    await renderPage([{ ...boursorama, institution: '  ' }], []);

    const row = await screen.findByTestId('account-row');

    expect(row).not.toHaveTextContent('·');
    expect(row.querySelectorAll('td')[2]).toHaveTextContent('—');
  });

  it('should render a card row per account on iPhone, linking to the holdings of that account', async () => {
    await renderPage();

    const rows = await screen.findAllByTestId('account-row-mobile');

    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByTestId('account-link-mobile')).toHaveAttribute('href', '/holdings?compte=a1');
    expect(screen.getAllByTestId('account-link')[0]).toHaveAttribute('href', '/holdings?compte=a1');
  });

  it('should open the edit and delete dialogs from the iPhone row menu', async () => {
    const user = userEvent.setup();
    await renderPage();

    const row = (await screen.findAllByTestId('account-row-mobile'))[0]!;
    await user.click(within(row).getByTestId('account-menu-trigger-mobile'));
    await user.click(within(row).getByTestId('account-edit-mobile'));

    expect(await screen.findByTestId('account-form-dialog')).toBeInTheDocument();

    await user.click(screen.getByTestId('account-form-cancel'));
    await user.click(within(row).getByTestId('account-menu-trigger-mobile'));
    await user.click(within(row).getByTestId('account-delete-mobile'));

    expect(await screen.findByTestId('account-delete-dialog')).toBeInTheDocument();
  });

  it('should summarise the count and the total above the table', async () => {
    await renderPage();

    const summary = await screen.findByTestId('accounts-summary');

    expect(summary).toHaveTextContent('accounts.summary_other');
    expect(summary).toHaveTextContent(/1[^0-9]500,00/);
  });

  it('should list the accounts by value, largest first, with their share of the total', async () => {
    await renderPage([livretA, boursorama]);

    const rows = await screen.findAllByTestId('account-row');

    expect(rows.map((row) => within(row).getByTestId('account-link').textContent?.trim())).toEqual([
      'PEA Boursorama',
      'Livret A',
    ]);
    expect(rows[0]).toHaveTextContent(/66,7[^0-9]%/);
    expect(rows[1]).toHaveTextContent(/33,3[^0-9]%/);
  });

  it('should name the columns of the table', async () => {
    await renderPage();

    const headers = (await screen.findAllByRole('columnheader')).map((header) => header.textContent?.trim());

    expect(headers).toEqual([
      'accounts.columns.account',
      'accounts.columns.type',
      'accounts.columns.institution',
      'accounts.columns.lines',
      'accounts.columns.value',
      'accounts.columns.share',
      'accounts.columns.actions',
    ]);
  });

  it('should count the lines of a savings account as booklets', async () => {
    await renderPage(
      [livretA],
      [{ accountId: 'a2', assetClass: 'CASH', priceSource: 'MANUAL', accountCash: false, marketValueEur: 500 }],
    );

    expect((await screen.findAllByText(/accounts.bookletCount_one/)).length).toBeGreaterThan(0);
  });

  it('should show a dash, not 0, for the value and the share of an account with an unvalued line', async () => {
    await renderPage(
      [boursorama],
      [{ accountId: 'a1', assetClass: 'ETF', priceSource: 'YAHOO', priceCurrency: 'EUR', marketValueEur: null }],
    );

    const row = await screen.findByTestId('account-row');

    expect(row).toHaveTextContent('—');
    expect(row).not.toHaveTextContent('0,00');
  });

  it('should send the empty-account hint to the holdings list for that account, and to the import', async () => {
    await renderPage([boursorama], []);

    expect(await screen.findByTestId('account-empty-add')).toHaveAttribute('href', '/holdings?add=a1');
    expect(screen.getByTestId('account-empty-import')).toHaveAttribute('href', '/profile');
    expect(screen.getAllByTestId('account-row')[0]).toHaveTextContent('accounts.noLine');
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

    await vi.waitFor(() => expect(screen.queryByTestId('account-form-dialog')).not.toBeInTheDocument());
    httpTesting.expectNone('/api/accounts');
    expect(TestBed.inject(UiToasts).toast()).toBeNull();
  });

  it('should open the edit dialog prefilled from the row menu', async () => {
    const user = userEvent.setup();
    await renderPage([boursorama], []);

    await user.click(await screen.findByTestId('account-menu-trigger'));
    await user.click(screen.getByTestId('account-edit'));

    expect(await screen.findByTestId('account-form-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('account-form-name')).toHaveValue('PEA Boursorama');
  });

  it('should confirm an edited account', async () => {
    const user = userEvent.setup();
    await renderPage([boursorama], []);

    await user.click(await screen.findByTestId('account-menu-trigger'));
    await user.click(screen.getByTestId('account-edit'));
    await user.click(await screen.findByTestId('account-form-submit'));

    await vi.waitFor(() => httpTesting.expectOne('/api/accounts/a1').flush(boursorama));
    await vi.waitFor(() => httpTesting.expectOne('/api/accounts')).then((request) => request.flush([boursorama]));
    await vi
      .waitFor(() => httpTesting.expectOne('/api/portfolio'))
      .then((request) => request.flush({ byAssetClass: [], byAccount: [], holdings: [] }));
    expect(TestBed.inject(UiToasts).toast()?.text).toBe('accounts.toasts.updated');
  });

  it('should reload the list once the form is saved', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByTestId('account-add'));
    await user.type(screen.getByTestId('account-form-name'), 'CTO Bourso');
    await user.click(screen.getByRole('radio', { name: 'enums.accountType.CTO' }));
    await user.type(screen.getByTestId('account-form-institution'), 'Boursorama');
    await user.click(screen.getByTestId('account-form-submit'));

    await vi.waitFor(() => httpTesting.expectOne('/api/accounts').flush({ ...boursorama, id: 'a3' }));

    await vi
      .waitFor(() => httpTesting.expectOne('/api/accounts'))
      .then((request) => request.flush([boursorama, livretA]));
    await vi
      .waitFor(() => httpTesting.expectOne('/api/portfolio'))
      .then((request) => request.flush({ byAssetClass: [], byAccount: [], holdings: [] }));
    expect(TestBed.inject(UiToasts).toast()?.text).toBe('accounts.toasts.created');
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
    expect(TestBed.inject(UiToasts).toast()?.text).toBe('accounts.toasts.deleted');
  });

  it('should dismiss the delete dialog without deleting anything', async () => {
    const user = userEvent.setup();
    await renderPage([boursorama], []);

    await user.click(await screen.findByTestId('account-menu-trigger'));
    await user.click(screen.getByTestId('account-delete'));
    await user.click(await screen.findByTestId('account-delete-cancel'));

    await vi.waitFor(() => expect(screen.queryByTestId('account-delete-dialog')).not.toBeInTheDocument());
    expect(TestBed.inject(UiToasts).toast()).toBeNull();
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

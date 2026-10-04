import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingChanges } from '../holding-changes';
import { HoldingAddDialog } from './holding-add-dialog';

const accounts = [{ id: 'a1', name: 'Northwind PEA', type: 'PEA', institution: 'Northwind Bank' }];
const instruments = [
  { id: 'i1', name: 'Amundi MSCI World', isin: 'LU1681043599', currency: 'EUR', assetClass: 'ETF' },
  { id: 'i2', name: 'iShares MSCI World USD', isin: 'IE00B4L5Y983', currency: 'USD', assetClass: 'ETF' },
  { id: 'i3', name: 'Lyxor MSCI USD Tracker', isin: 'LU0000000003', currency: 'EUR', assetClass: 'ETF' },
];

describe('HoldingAddDialog quotes in another currency', () => {
  let httpTesting: HttpTestingController;

  const renderDialog = async (catalog: unknown[] = instruments, holdings: unknown[] = []): Promise<void> => {
    await render(HoldingAddDialog, {
      imports: [getTranslocoTestingModule()],
      providers: [
        HoldingChanges,
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'en-GB' },
        provideTranslocoScope('holdings'),
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.expectOne('/api/accounts').flush(accounts);
    httpTesting.expectOne('/api/instruments').flush(catalog);
    httpTesting.expectOne('/api/holdings').flush(holdings);
  };

  afterEach(() => httpTesting.verify());

  it('marks an online candidate quoted in another currency as unavailable, with its exchange or a dash', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('holding-add-query'), 'nasdaq');
    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve'))).flush([
      {
        name: 'Nasdaq 100 ETF',
        source: 'YAHOO',
        sourceRef: 'QQQ',
        assetClass: 'ETF',
        currency: 'USD',
        exchange: 'NMS',
      },
      { name: 'Nasdaq 100 UCITS', source: 'YAHOO', sourceRef: 'EQQQ.DE', assetClass: 'ETF', currency: 'USD' },
    ]);

    const [withExchange, withoutExchange] = await screen.findAllByTestId('holding-add-online-candidate');

    expect(withExchange).toHaveAttribute('aria-disabled', 'true');
    expect(withExchange).toHaveTextContent('NMS');
    expect(withExchange).toHaveTextContent('holdings.add.unavailableSub');
    expect(withoutExchange).toHaveTextContent('—');
  });

  it('lists catalogue titles quoted in another currency last, the quote of a held line winning over the instrument currency', async () => {
    const user = userEvent.setup();
    await renderDialog(instruments, [{ id: 'h2', instrumentId: 'i1', priceCurrency: 'USD' }]);

    await user.type(screen.getByTestId('holding-add-query'), 'msci');

    const rows = await screen.findAllByTestId('holding-add-catalog-candidate');
    expect(rows.map((row) => row.querySelector('.font-medium')?.textContent?.trim())).toEqual([
      'Lyxor MSCI USD Tracker',
      'Amundi MSCI World',
      'iShares MSCI World USD',
    ]);
    expect(rows[0]).not.toHaveAttribute('aria-disabled');
    expect(rows[1]).toHaveAttribute('aria-disabled', 'true');
    expect(rows[2]).toHaveAttribute('aria-disabled', 'true');
    expect(rows[1]).toHaveTextContent('holdings.add.unavailable');
    await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve').flush([]));
  });

  it('ungreys a USD-listed title whose held line is quoted in euros', async () => {
    const user = userEvent.setup();
    await renderDialog(instruments, [{ id: 'h2', instrumentId: 'i2', priceCurrency: 'EUR' }]);

    await user.type(screen.getByTestId('holding-add-query'), 'msci');

    const rows = await screen.findAllByTestId('holding-add-catalog-candidate');
    expect(rows.map((row) => row.getAttribute('aria-disabled'))).toEqual([null, null, null]);
    await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve').flush([]));
  });

  it('never picks a greyed catalogue row', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('holding-add-query'), 'iShares');
    await user.click(await screen.findByTestId('holding-add-catalog-candidate'));

    expect(screen.queryByTestId('holding-add-quantity')).not.toBeInTheDocument();
    await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve').flush([]));
  });

  it('creates an online title with the currency of its candidate', async () => {
    const user = userEvent.setup();
    await renderDialog();
    await screen.findByRole('option', { name: /Northwind PEA/ });

    await user.type(screen.getByTestId('holding-add-query'), 'zzz world');
    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve'))).flush([
      {
        name: 'Contoso World',
        source: 'YAHOO',
        sourceRef: 'CWLD.AS',
        assetClass: 'ETF',
        currency: 'EUR',
        probePrice: 10,
      },
    ]);
    await user.click(await screen.findByTestId('holding-add-online-candidate'));
    await user.type(screen.getByTestId('holding-add-quantity'), '2');
    await user.click(screen.getByTestId('holding-add-submit'));

    const create = await vi.waitFor(() => httpTesting.expectOne('/api/instruments'));
    expect(create.request.body).toMatchObject({ currency: 'EUR', sourceRef: 'CWLD.AS' });
    create.flush({ id: 'i9' });
    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings'))).flush({ id: 'h9' });
  });
});

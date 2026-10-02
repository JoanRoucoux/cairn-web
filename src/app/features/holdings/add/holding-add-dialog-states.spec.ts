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

const accounts = [{ id: 'a1', name: 'Saxo Investor', type: 'PEA', institution: 'Saxo' }];
const instruments = [
  { id: 'i1', name: 'Amundi MSCI World', isin: 'LU1681043599', assetClass: 'ETF', priceSource: 'YAHOO' },
];
const failure = { status: 500, statusText: 'Server Error' };

describe('HoldingAddDialog when its calls are late or failing', () => {
  let httpTesting: HttpTestingController;

  const renderDialog = async (
    holdings: unknown[] | 'fail',
    accountList: unknown[] | 'fail' = accounts,
    catalog: unknown[] = instruments,
  ): Promise<void> => {
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
    const flush = (url: string, body: unknown[] | 'fail'): void => {
      const request = httpTesting.expectOne(url);
      if (body === 'fail') {
        request.flush(null, failure);
      } else {
        request.flush(body);
      }
    };
    flush('/api/accounts', accountList);
    flush('/api/instruments', catalog);
    flush('/api/holdings', holdings);
  };

  afterEach(() => httpTesting.verify());

  const search = async (query = 'msci'): Promise<void> => {
    const user = userEvent.setup();
    await user.type(screen.getByTestId('holding-add-query'), query);
    await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve').flush([]));
  };

  it('shows no line count when the holdings could not be read', async () => {
    await renderDialog('fail');
    await search();

    const row = await screen.findByTestId('holding-add-catalog-candidate');

    expect(row).not.toHaveTextContent('holdings.add.noLine');
    expect(row).not.toHaveTextContent('holdings.add.lineCount');
  });

  it('shows the symbol of an instrument that has no ISIN', async () => {
    await renderDialog([], accounts, [
      { id: 'i9', name: 'Bitcoin', isin: null, symbol: 'BTC', assetClass: 'CRYPTO', priceSource: 'COINGECKO' },
    ]);
    await search('btc');

    const row = await screen.findByTestId('holding-add-catalog-candidate');

    expect(row).toHaveTextContent('Bitcoin');
    expect(row).toHaveTextContent('BTC · enums.assetClass.CRYPTO');
  });

  it('shows the plural line count of an instrument that has holdings', async () => {
    await renderDialog([{ instrumentId: 'i1' }, { instrumentId: 'i1' }]);
    await search();

    expect(await screen.findByTestId('holding-add-catalog-candidate')).toHaveTextContent(
      'holdings.add.lineCount_other',
    );
  });

  it('preselects no account when there is none to choose', async () => {
    await renderDialog([], []);

    expect((screen.getByTestId('holding-add-account') as HTMLSelectElement).value).toBe('');
  });

  it('preselects no account when the accounts could not be read', async () => {
    await renderDialog([], 'fail');

    expect((screen.getByTestId('holding-add-account') as HTMLSelectElement).value).toBe('');
  });
});

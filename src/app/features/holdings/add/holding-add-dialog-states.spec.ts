import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideTranslocoScope } from '@jsverse/transloco';
import { fireEvent, render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingChanges } from '../holding-changes';
import { HoldingAddDialog } from './holding-add-dialog';

const accounts = [{ id: 'a1', name: 'Northwind PEA', type: 'PEA', institution: 'Northwind Bank' }];

const bitcoin = {
  id: 'h1',
  accountId: 'a1',
  instrumentId: 'i1',
  instrumentName: 'Bitcoin',
  symbol: 'BTC',
  sourceRef: 'bitcoin',
  assetClass: 'CRYPTO',
  priceSource: 'COINGECKO',
  price: 61240,
};

describe('HoldingAddDialog states', () => {
  let httpTesting: HttpTestingController;

  const renderDialog = async (): Promise<void> => {
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
  };

  const flushSearches = async (): Promise<void> => {
    const searches = await vi.waitFor(() => {
      const pending = httpTesting.match((request) => request.url === '/api/instruments/search');
      expect(pending.length).toBeGreaterThan(0);

      return pending;
    });
    searches.forEach((request) => request.flush([]));
  };

  afterEach(() => httpTesting.verify());

  it('says the tracked titles could not be read, and reads them again on retry', async () => {
    const user = userEvent.setup();
    await renderDialog();
    httpTesting.expectOne('/api/holdings').flush(null, { status: 500, statusText: 'Server Error' });

    await user.type(screen.getByTestId('holding-add-query'), 'bitcoin');
    await flushSearches();

    expect(await screen.findByText('holdings.add.tracked.error')).toBeInTheDocument();
    expect(screen.queryByTestId('holding-add-none-found')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'holdings.add.tracked.retry' }));
    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings'))).flush([bitcoin]);

    expect(await screen.findByTestId('holding-add-tracked-title')).toHaveTextContent(
      /BTC · enums.assetClass.CRYPTO · enums.priceSource.COINGECKO\s*€61,240.00/,
    );
  });

  it('goes back from the manual form to the search', async () => {
    const user = userEvent.setup();
    await renderDialog();
    httpTesting.expectOne('/api/holdings').flush([]);

    await user.click(screen.getByTestId('holding-add-manual-link'));
    await user.click(screen.getByTestId('holding-add-back'));

    expect(screen.getByTestId('holding-add-query')).toBeInTheDocument();
    expect(screen.queryByTestId('holding-add-manual-name')).not.toBeInTheDocument();
  });

  it('ignores a submit while the line is incomplete', async () => {
    await renderDialog();
    httpTesting.expectOne('/api/holdings').flush([]);

    fireEvent.submit(screen.getByTestId('holding-add-query').closest('form') as HTMLFormElement);

    httpTesting.expectNone('/api/holdings');
  });
});

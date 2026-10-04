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
const usdInstrument = {
  id: 'i2',
  name: 'Nasdaq 100 ETF',
  isin: 'US46090E1038',
  currency: 'USD',
  assetClass: 'ETF',
  priceSource: 'YAHOO',
};

describe('HoldingAddDialog quotes in another currency', () => {
  let httpTesting: HttpTestingController;

  const renderDialog = async (catalog: unknown[] = []): Promise<void> => {
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
    httpTesting.expectOne('/api/holdings').flush([]);
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

  it('marks a catalogue title quoted in another currency as unavailable', async () => {
    const user = userEvent.setup();
    await renderDialog([usdInstrument]);

    await user.type(screen.getByTestId('holding-add-query'), 'nasdaq');

    const result = await screen.findByTestId('holding-add-catalog-candidate');

    expect(result).toHaveAttribute('aria-disabled', 'true');
    expect(result).toHaveTextContent('holdings.add.unavailable');
    await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve').flush([]));
  });
});

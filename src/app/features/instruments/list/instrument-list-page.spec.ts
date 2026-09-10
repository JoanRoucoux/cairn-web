import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { InstrumentListPage } from './instrument-list-page';
import { InstrumentListStore } from './instrument-list-store';

describe('InstrumentListPage', () => {
  let httpTesting: HttpTestingController;

  const renderPage = async (): Promise<void> => {
    await render(InstrumentListPage, {
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        InstrumentListStore,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
  };

  afterEach(() => httpTesting.verify());

  it('should list the instruments the server returns', async () => {
    await renderPage();

    await vi.waitFor(() =>
      httpTesting
        .expectOne('/api/instruments')
        .flush([
          { id: 'i1', name: 'BNP Paribas Easy S&P 500', isin: 'FR0011550185', assetClass: 'ETF', priceSource: 'YAHOO' },
        ]),
    );

    expect(await screen.findAllByTestId('instrument-row')).toHaveLength(1);
  });

  it('names the asset class and the price source through a translation key', async () => {
    await renderPage();

    await vi.waitFor(() =>
      httpTesting
        .expectOne('/api/instruments')
        .flush([
          { id: 'i1', name: 'BNP Paribas Easy S&P 500', isin: 'FR0011550185', assetClass: 'ETF', priceSource: 'YAHOO' },
        ]),
    );
    await screen.findAllByTestId('instrument-row');

    expect(screen.getByText('enums.assetClass.ETF')).toBeInTheDocument();
    expect(screen.getByText('enums.priceSource.YAHOO')).toBeInTheDocument();
  });

  it('should filter the instruments by name or isin', async () => {
    const user = userEvent.setup();
    await renderPage();

    await vi.waitFor(() =>
      httpTesting.expectOne('/api/instruments').flush([
        { id: 'i1', name: 'BNP Paribas Easy S&P 500', isin: 'FR0011550185', assetClass: 'ETF', priceSource: 'YAHOO' },
        { id: 'i2', name: 'Bitcoin', isin: null, assetClass: 'CRYPTO', priceSource: 'COINGECKO' },
      ]),
    );
    await screen.findAllByTestId('instrument-row');

    await user.type(screen.getByTestId('instruments-search'), 'bitcoin');

    expect(await screen.findAllByTestId('instrument-row')).toHaveLength(1);
    expect(screen.getByText('Bitcoin')).toBeInTheDocument();
  });

  it('should show an empty state with no match', async () => {
    await renderPage();

    await vi.waitFor(() => httpTesting.expectOne('/api/instruments').flush([]));

    expect(await screen.findByText('instruments.empty')).toBeInTheDocument();
  });

  it('should show an error when instruments cannot load', async () => {
    await renderPage();

    await vi.waitFor(() =>
      httpTesting.expectOne('/api/instruments').flush(null, { status: 500, statusText: 'Server Error' }),
    );

    expect(await screen.findByText('instruments.error')).toBeInTheDocument();
  });
});

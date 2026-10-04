import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterOutlet } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingChanges } from '../holding-changes';
import { HoldingDetailPage } from './holding-detail-page';

@Component({ selector: 'app-test-host', imports: [RouterOutlet], template: '<router-outlet />' })
class TestHost {}

const usdHolding = {
  id: 'h1',
  instrumentId: 'i1',
  instrumentName: 'iShares Core MSCI World USD',
  isin: 'IE00B4L5Y983',
  accountName: 'Northwind PEA',
  accountType: 'PEA',
  assetClass: 'ETF',
  quantity: 10,
  price: 112.36,
  priceCurrency: 'USD',
  averageCost: 90,
  marketValueEur: null,
  unrealizedGainEur: null,
  unrealizedGainRatio: null,
  dayChangeEur: null,
  dayChangeRatio: null,
  priceSource: 'YAHOO',
  priceAsOf: '2026-08-21',
  stale: false,
};

describe('HoldingDetailPage on a line quoted in another currency', () => {
  let httpTesting: HttpTestingController;

  const settle = async (): Promise<void> => {
    for (let i = 0; i < 10; i++) {
      TestBed.tick();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  };

  const renderPage = async (fixtureHolding: Record<string, unknown> = usdHolding): Promise<void> => {
    await render(TestHost, {
      imports: [getTranslocoTestingModule()],
      routes: [{ path: 'holdings/:holdingId', component: HoldingDetailPage }],
      initialRoute: 'holdings/h1',
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
    httpTesting.expectOne('/api/holdings').flush([fixtureHolding]);
    await settle();
    await flushSideRequests();
  };

  const flushSideRequests = async (): Promise<void> => {
    httpTesting
      .match((request) => request.url === '/api/instruments/i1')
      .filter((request) => !request.cancelled)
      .forEach((request) => request.flush({ description: '' }));
    httpTesting
      .match((request) => request.url.includes('/quotes'))
      .filter((request) => !request.cancelled)
      .forEach((request) => request.flush([]));
    await settle();
  };

  afterEach(() => httpTesting.verify());

  it('shows a dash for the value, the quote in its own currency and the caption instead of the chart', async () => {
    await renderPage();

    expect(await screen.findByText('—')).toBeInTheDocument();
    expect(screen.getByTestId('no-quote-yet')).toHaveTextContent('holdings.foreignQuote');
    expect(screen.queryByTestId('range-change')).not.toBeInTheDocument();
    expect(document.body).toHaveTextContent('US$112.36');
    expect(screen.queryByText('holdings.averageCostUnknownShort')).not.toBeInTheDocument();
  });

  it('hides Buy and Sell on the page and in the action bar, leaving only the menu', async () => {
    await renderPage();
    await screen.findByTestId('holding-menu-trigger-desktop');

    expect(screen.queryByTestId('holding-buy')).not.toBeInTheDocument();
    expect(screen.queryByTestId('holding-sell')).not.toBeInTheDocument();
    expect(screen.queryByTestId('holding-buy-bar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('holding-sell-bar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('enter-quote')).not.toBeInTheDocument();
  });

  it('offers only Modifier and Supprimer la ligne in the menu', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(await screen.findByTestId('holding-menu-trigger-mobile'));

    expect(screen.getByRole('menu', { hidden: true }).querySelectorAll('button')).toHaveLength(2);
    expect(screen.getByTestId('holding-edit')).toBeInTheDocument();
    expect(screen.getByTestId('holding-delete')).toBeInTheDocument();
  });

  it('keeps Buy, Sell and the chart for a line quoted in euros', async () => {
    await renderPage({ ...usdHolding, priceCurrency: 'EUR', marketValueEur: 1123.6 });

    expect(await screen.findByTestId('holding-buy')).toBeInTheDocument();
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterOutlet } from '@angular/router';

import { UiToasts } from '@joanroucoux/cairn-ui';
import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { slowDialogExit } from '@shared/testing/dialog-exit';
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
  accountName: 'Saxo Investor',
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

  it('hides Buy and Sell on the page and in the action bar', async () => {
    await renderPage();
    await screen.findByTestId('holding-change-listing');

    expect(screen.queryByTestId('holding-buy')).not.toBeInTheDocument();
    expect(screen.queryByTestId('holding-sell')).not.toBeInTheDocument();
    expect(screen.queryByTestId('holding-buy-bar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('holding-sell-bar')).not.toBeInTheDocument();
  });

  it('offers the change of listing in the menu, on the desktop actions and below the facts on iPhone', async () => {
    await renderPage();

    expect(await screen.findByTestId('holding-change-listing')).toHaveTextContent('holdings.replace.open');
    expect(screen.getByTestId('holding-change-listing-mobile')).toHaveClass('lg:hidden');
    expect(screen.getByTestId('holding-change-listing-menu')).toHaveTextContent('holdings.replace.open');
    expect(screen.queryByTestId('enter-quote')).not.toBeInTheDocument();
  });

  it.each(['holding-change-listing', 'holding-change-listing-mobile', 'holding-change-listing-menu'])(
    'opens the search on the ISIN from %s, then moves the line, reloads and confirms',
    async (trigger) => {
      const user = userEvent.setup();
      await renderPage();

      if (trigger.endsWith('menu')) {
        await user.click(screen.getByTestId('holding-menu-trigger-mobile'));
      }

      await user.click(await screen.findByTestId(trigger));

      expect(await screen.findByTestId('holding-add-query')).toHaveValue('IE00B4L5Y983');
      httpTesting.expectOne('/api/accounts').flush([]);
      httpTesting.expectOne('/api/instruments').flush([]);
      httpTesting.expectOne('/api/holdings').flush([]);
      (await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve'))).flush([
        {
          name: 'iShares Core MSCI World',
          source: 'YAHOO',
          sourceRef: 'IWDA.AS',
          assetClass: 'ETF',
          exchange: 'Euronext Amsterdam',
          probePrice: 97.91,
          currency: 'EUR',
        },
      ]);

      await user.click(await screen.findByTestId('holding-add-online-candidate'));
      (await vi.waitFor(() => httpTesting.expectOne('/api/instruments'))).flush({ id: 'i9' });
      (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/instrument'))).flush({ id: 'h1' });

      await vi.waitFor(() => expect(screen.queryByTestId('holding-add-query')).not.toBeInTheDocument());
      expect(TestBed.inject(HoldingChanges).lastTouched()?.id).toBe('h1');
      expect(TestBed.inject(UiToasts).toast()?.text).toBe('holdings.toasts.listingChanged');
      httpTesting.expectOne('/api/holdings').flush([{ ...usdHolding, priceCurrency: 'EUR', marketValueEur: 1000 }]);
      await settle();
      await flushSideRequests();
    },
  );

  it('keeps the search of the line it opened with while the moved line reloads under its exit', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(await screen.findByTestId('holding-change-listing'));
    httpTesting.expectOne('/api/accounts').flush([]);
    httpTesting.expectOne('/api/instruments').flush([]);
    httpTesting.expectOne('/api/holdings').flush([]);
    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve'))).flush([
      { name: 'iShares Core MSCI World', source: 'YAHOO', sourceRef: 'IWDA.AS', assetClass: 'ETF', currency: 'EUR' },
    ]);
    slowDialogExit(400);

    await user.click(await screen.findByTestId('holding-add-online-candidate'));
    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments'))).flush({ id: 'i9' });
    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/instrument'))).flush({ id: 'h1' });
    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings'))).flush([
      { ...usdHolding, instrumentId: 'i9', isin: null, symbol: 'IWDA.AS', priceCurrency: 'EUR', marketValueEur: 1000 },
    ]);
    await settle();

    expect(screen.getByTestId('holding-add-query')).toHaveValue('IE00B4L5Y983');
    httpTesting
      .match((request) => request.url === '/api/instruments/i9' || request.url.includes('/quotes'))
      .filter((request) => !request.cancelled)
      .forEach((request) => request.flush(request.request.url.includes('/quotes') ? [] : {}));
    await vi.waitFor(() => expect(screen.queryByTestId('holding-add-query')).not.toBeInTheDocument());
  });

  it('closes the search without moving anything when dismissed', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(await screen.findByTestId('holding-change-listing'));
    httpTesting.expectOne('/api/accounts').flush([]);
    httpTesting.expectOne('/api/instruments').flush([]);
    httpTesting.expectOne('/api/holdings').flush([]);
    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve'))).flush([]);

    await user.click(await screen.findByTestId('holding-add-cancel'));

    await vi.waitFor(() => expect(screen.queryByTestId('holding-add-query')).not.toBeInTheDocument());
    expect(TestBed.inject(HoldingChanges).lastTouched()).toBeNull();
  });

  it('keeps Buy, Sell and the chart for a line quoted in euros', async () => {
    await renderPage({ ...usdHolding, priceCurrency: 'EUR', marketValueEur: 1123.6 });

    expect(await screen.findByTestId('holding-buy')).toBeInTheDocument();
    expect(screen.queryByTestId('holding-change-listing')).not.toBeInTheDocument();
    expect(screen.queryByTestId('holding-change-listing-menu')).not.toBeInTheDocument();
  });
});

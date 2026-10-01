import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterOutlet } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingDetailPage } from './holding-detail-page';

@Component({ selector: 'app-test-host', imports: [RouterOutlet], template: '<router-outlet />' })
class TestHost {}

const holding = {
  id: 'h1',
  instrumentId: 'i1',
  instrumentName: 'BNP Paribas Easy S&P 500',
  isin: 'FR0011550185',
  accountName: 'Saxo Investor',
  accountType: 'PEA',
  assetClass: 'ETF',
  quantity: 10,
  price: 33,
  averageCost: 26.654,
  marketValueEur: 330,
  unrealizedGainEur: 63,
  unrealizedGainRatio: 0.2,
  dayChangeEur: 1,
  dayChangeRatio: 0.003,
  priceSource: 'YAHOO',
  priceAsOf: '2026-08-21',
  stale: false,
};

describe('HoldingDetailPage figures', () => {
  let httpTesting: HttpTestingController;

  const renderPage = async (
    fixtureHolding: Record<string, unknown> = holding,
    quotes: unknown[] = [],
  ): Promise<void> => {
    await render(TestHost, {
      imports: [getTranslocoTestingModule()],
      routes: [{ path: 'holdings/:holdingId', component: HoldingDetailPage }],
      initialRoute: 'holdings/h1',
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'en-GB' },
        provideTranslocoScope('holdings'),
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.expectOne('/api/holdings').flush([fixtureHolding]);
    for (let i = 0; i < 10; i++) {
      TestBed.tick();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    httpTesting
      .match((request) => request.url === '/api/instruments/i1')
      .forEach((request) => request.flush({ description: 'ETF.' }));
    httpTesting.match((request) => request.url.includes('/quotes')).forEach((request) => request.flush(quotes));
  };

  afterEach(() => httpTesting.verify());

  it('summarises the change of the value over the range above the chart', async () => {
    await renderPage(holding, [
      { asOf: '2026-08-21', price: 30 },
      { asOf: '2026-09-21', price: 33 },
    ]);

    const change = await screen.findByTestId('range-change');

    expect(change).toHaveTextContent('+10.00%');
    expect(change).toHaveTextContent('holdings.detail.rangeChange.1m');
  });

  it('leaves the ratio out when the range starts at zero', async () => {
    await renderPage(holding, [
      { asOf: '2026-08-21', price: 0 },
      { asOf: '2026-09-21', price: 33 },
    ]);

    expect(await screen.findByTestId('range-change')).not.toHaveTextContent('%');
  });

  it('says the cost is unknown instead of a gain when there is no cost basis', async () => {
    await renderPage({ ...holding, unrealizedGainEur: null, averageCost: null });

    expect(await screen.findByText('holdings.averageCostUnknownShort')).toBeInTheDocument();
  });

  it('shows the stale quote line instead of a day change', async () => {
    await renderPage({ ...holding, stale: true });

    expect(await screen.findByTestId('quote-line')).toHaveTextContent('holdings.staleLate');
  });

  it('shows the unknown cost basis text when the average cost is missing', async () => {
    await renderPage({ ...holding, averageCost: null });

    expect(await screen.findByText('holdings.detail.unknownCost')).toBeInTheDocument();
  });

  it('shows a dash instead of a blank ISIN for a holding with none', async () => {
    await renderPage({ ...holding, isin: null });

    expect((await screen.findAllByText('—')).length).toBeGreaterThan(0);
  });
});

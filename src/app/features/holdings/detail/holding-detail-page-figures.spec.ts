import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';

import { UiLineChart } from '@joanroucoux/cairn-ui/line-chart';
import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingChanges } from '../holding-changes';
import { HoldingDetailPage } from './holding-detail-page';

@Component({ selector: 'app-test-host', imports: [RouterOutlet], template: '<router-outlet />' })
class TestHost {}

const holding = {
  id: 'h1',
  instrumentId: 'i1',
  instrumentName: 'BNP Paribas Easy S&P 500',
  isin: 'FR0011550185',
  accountName: 'Northwind PEA',
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
  let rendered: ComponentFixture<unknown>;

  const renderPage = async (
    fixtureHolding: Record<string, unknown> = holding,
    quotes: unknown[] = [],
  ): Promise<HoldingDetailPage> => {
    const { fixture } = await render(TestHost, {
      imports: [
        getTranslocoTestingModule({
          langs: { en: {}, fr: {}, 'holdings/en': { detail: { tooltip: '{{value}} / {{price}}' } }, 'holdings/fr': {} },
        }),
      ],
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
    rendered = fixture;
    httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.expectOne('/api/holdings').flush([fixtureHolding]);
    for (let i = 0; i < 10; i++) {
      TestBed.tick();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    httpTesting.match((request) => request.url.includes('/quotes')).forEach((request) => request.flush(quotes));

    return fixture.debugElement.query(By.directive(HoldingDetailPage)).componentInstance as HoldingDetailPage;
  };

  afterEach(() => httpTesting.verify());

  it('keeps the chart range key when a purchase reloads the series, so it redraws without interpolating', async () => {
    const quotes = [
      { asOf: '2026-08-21', price: 30 },
      { asOf: '2026-09-21', price: 33 },
    ];
    await renderPage(holding, quotes);
    const rangeKey = (): string | null =>
      (rendered.debugElement.query(By.directive(UiLineChart)).componentInstance as UiLineChart).rangeKey();

    await screen.findByTestId('range-change');
    expect(rangeKey()).toBe('1m');

    TestBed.inject(HoldingChanges).touched('h1');
    await vi.waitFor(() => httpTesting.expectOne('/api/holdings').flush([holding]));
    await vi.waitFor(() => {
      const pending = httpTesting.match((request) => request.url.includes('/quotes'));
      expect(pending).toHaveLength(1);
      pending[0]?.flush([...quotes, { asOf: '2026-09-22', price: 34 }]);
    });

    await vi.waitFor(() => expect(rangeKey()).toBe('1m'));
  });

  it('gives the chart tooltip the value and the unit price', async () => {
    const page = await renderPage();
    const tooltip = (
      page as unknown as { tooltipFormat: () => (point: { t: number; v: number }) => string }
    ).tooltipFormat();

    expect(tooltip({ t: 0, v: 300 })).toBe('€300.00 / €30.00');
  });

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

    expect(await screen.findByText(/holdings.staleLate/)).toBeInTheDocument();
  });

  it('shows the unknown cost basis text when the average cost is missing', async () => {
    await renderPage({ ...holding, averageCost: null });

    expect(await screen.findByText('holdings.detail.unknownCost')).toBeInTheDocument();
  });

  it('shows a dash instead of a blank ISIN for a holding with none', async () => {
    await renderPage({ ...holding, isin: null });

    expect((await screen.findByText('holdings.detail.isin')).parentElement).toHaveTextContent('—');
  });

  it('keeps the chart mounted while a new range loads', async () => {
    const user = userEvent.setup();
    await renderPage(holding, [{ asOf: '2026-08-21', price: 30 }]);
    const chart = document.querySelector('ui-line-chart');

    expect(chart).not.toBeNull();

    await user.click(screen.getByRole('radio', { name: 'chart.range.1y' }));
    TestBed.tick();

    expect(document.querySelector('ui-line-chart')).toBe(chart);
    httpTesting.match((request) => request.url.includes('/quotes')).forEach((request) => request.flush([]));
  });

  it('keeps the range variation of the series shown, labelled with its own range, while a new range loads', async () => {
    const user = userEvent.setup();
    await renderPage(holding, [
      { asOf: '2026-08-21', price: 30 },
      { asOf: '2026-09-21', price: 33 },
    ]);
    expect(await screen.findByTestId('range-change')).toHaveTextContent('holdings.detail.rangeChange.1m');

    await user.click(screen.getByRole('radio', { name: 'chart.range.1y' }));
    TestBed.tick();

    expect(screen.getByTestId('range-change')).toHaveTextContent('holdings.detail.rangeChange.1m');
    expect(screen.getByTestId('range-change')).toHaveTextContent('+10.00%');
    httpTesting
      .match((request) => request.url.includes('/quotes'))
      .forEach((request) =>
        request.flush([
          { asOf: '2025-09-21', price: 15 },
          { asOf: '2026-09-21', price: 33 },
        ]),
      );

    await vi.waitFor(() =>
      expect(screen.getByTestId('range-change')).toHaveTextContent('holdings.detail.rangeChange.1y'),
    );
    expect(screen.getByTestId('range-change')).toHaveTextContent('+120.00%');
  });

  it('shows the chart error with a retry that reloads only the quotes when the new range fails', async () => {
    const user = userEvent.setup();
    await renderPage(holding, [{ asOf: '2026-08-21', price: 30 }]);

    await user.click(screen.getByRole('radio', { name: 'chart.range.1y' }));
    httpTesting
      .match((request) => request.url.includes('/quotes'))
      .forEach((request) => request.flush(null, { status: 500, statusText: 'Server error' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('holdings.chartErrorTitle');
    expect(screen.queryByTestId('range-change')).not.toBeInTheDocument();
    expect(document.querySelector('ui-line-chart')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'holdings.retry' }));

    const retried = await vi.waitFor(() => {
      const requests = httpTesting.match((request) => request.url.includes('/quotes'));
      expect(requests).toHaveLength(1);

      return requests[0];
    });
    expect(document.querySelector('ui-line-chart')).toBeNull();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    retried?.flush([{ asOf: '2026-08-21', price: 30 }]);

    await vi.waitFor(() => expect(document.querySelector('ui-line-chart')).not.toBeNull());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

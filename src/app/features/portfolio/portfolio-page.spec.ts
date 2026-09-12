import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import type { HistoryResponse, PortfolioResponse } from '@core/api-client/cairnAPI.schemas';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { PortfolioPage } from './portfolio-page';
import { PortfolioStore } from './portfolio-store';

const portfolio = {
  totalEur: 278146.45,
  dayChangeEur: -712.98,
  dayChangeRatio: -0.0026,
  unrealizedGainEur: null,
  unrealizedGainRatio: null,
  staleCount: 2,
  unvaluedCount: 3,
  generatedAt: '2026-08-21T20:00:00Z',
  byAssetClass: [],
  byAccount: [],
  holdings: [],
} as unknown as PortfolioResponse;

const emptyHistory: HistoryResponse = { mode: 'constant-mix', reconstructed: false, points: [] };

describe('PortfolioPage', () => {
  let httpTesting: HttpTestingController;

  const renderPage = async (
    respondToPortfolio: (request: ReturnType<HttpTestingController['expectOne']>) => void = (request) =>
      request.flush(portfolio),
    history: HistoryResponse = emptyHistory,
    translations = getTranslocoTestingModule(),
  ): Promise<void> => {
    await render(PortfolioPage, {
      imports: [translations],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'en-GB' },
        // Provided by the route in the app, the test must mirror it.
        provideTranslocoScope('portfolio'),
        PortfolioStore,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    respondToPortfolio(httpTesting.expectOne((request) => request.url === '/api/portfolio'));
    await vi.waitFor(() => httpTesting.match((request) => request.url === '/api/history')[0]?.flush(history));
  };

  afterEach(() => httpTesting.verify());

  it('should display the total portfolio value', async () => {
    await renderPage();

    expect(await screen.findByText('€278,146.45')).toBeInTheDocument();
  });

  it('should display the day change as a signed amount', async () => {
    await renderPage();

    expect(await screen.findByText('−€712.98')).toBeInTheDocument();
  });

  it('should warn about stale quotes', async () => {
    await renderPage();

    expect(await screen.findByTestId('stale-banner')).toBeInTheDocument();
  });

  it('should warn about unvalued holdings', async () => {
    await renderPage();

    expect(await screen.findByTestId('unvalued-banner')).toBeInTheDocument();
  });

  it('should offer the six ranges', async () => {
    await renderPage();

    expect(await screen.findAllByRole('radio')).toHaveLength(6);
  });

  it('should warn when the curve is reconstructed', async () => {
    await renderPage(undefined, { mode: 'constant-mix', reconstructed: true, points: [] });

    expect(await screen.findByTestId('reconstructed-warning')).toBeInTheDocument();
  });

  it('should show an error message when the portfolio fails to load', async () => {
    await renderPage((request) => request.flush(null, { status: 500, statusText: 'Server Error' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('should not reload the history when the current range is re-picked', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(await screen.findByRole('radio', { name: 'chart.range.1d' }));

    expect(httpTesting.match((request) => request.url === '/api/history')).toHaveLength(0);
  });

  it('should request a new history when a range is picked', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(await screen.findByRole('radio', { name: 'chart.range.max' }));

    await vi.waitFor(() => {
      const pending = httpTesting.match((request) => request.url === '/api/history');
      expect(pending).toHaveLength(1);
      pending[0]?.flush(emptyHistory);
    });
  });

  it('should re-translate the range options when the active language changes', async () => {
    await renderPage(
      undefined,
      emptyHistory,
      getTranslocoTestingModule({
        langs: { en: { 'chart.range.1d': '1D' }, fr: { 'chart.range.1d': '1J' } },
      }),
    );

    expect(await screen.findByRole('radio', { name: '1D' })).toBeInTheDocument();

    TestBed.inject(TranslocoService).setActiveLang('fr');
    TestBed.tick();

    expect(await screen.findByRole('radio', { name: '1J' })).toBeInTheDocument();
  });
});

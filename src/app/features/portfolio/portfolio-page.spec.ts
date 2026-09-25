import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import type { HistoryResponse, IntradayHistoryResponse, PortfolioResponse } from '@core/api-client/cairnAPI.schemas';

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

const performance = {
  range: '1d',
  from: '2026-08-20',
  to: '2026-08-21',
  reconstructed: false,
  lastPriceAt: '2026-08-21T16:32:00Z',
  total: { valueEur: 278146.45, changeEur: -712.98, changeRatio: -0.0026 },
  byEnvelope: [{ accountType: 'PEA', valueEur: 278146.45, share: 1, changeEur: -712.98, changeRatio: -0.0026 }],
};

const emptyIntraday: IntradayHistoryResponse = { points: [] };
const emptyHistory: HistoryResponse = { mode: 'constant-mix', reconstructed: false, points: [] };

describe('PortfolioPage', () => {
  let httpTesting: HttpTestingController;

  const renderPage = async (
    respondToPortfolio: (request: ReturnType<HttpTestingController['expectOne']>) => void = (request) =>
      request.flush(portfolio),
    intraday: IntradayHistoryResponse = emptyIntraday,
    translations = getTranslocoTestingModule(),
    locale = 'en-GB',
  ): Promise<void> => {
    await render(PortfolioPage, {
      imports: [translations],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: locale },
        // Provided by the route in the app, the test must mirror it.
        provideTranslocoScope('portfolio'),
        PortfolioStore,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    respondToPortfolio(httpTesting.expectOne((request) => request.url === '/api/portfolio'));
    await vi.waitFor(() => httpTesting.match((request) => request.url === '/api/history/intraday')[0]?.flush(intraday));
    await vi.waitFor(() =>
      httpTesting.match((request) => request.url === '/api/portfolio/performance')[0]?.flush(performance),
    );
  };

  afterEach(() => httpTesting.verify());

  it('should display the total portfolio value without cents', async () => {
    await renderPage();

    expect(await screen.findByText('€278,146')).toBeInTheDocument();
  });

  it('should display the range change as a signed amount', async () => {
    await renderPage();

    expect(await screen.findAllByText('−€712.98')).not.toHaveLength(0);
  });

  it('should display one tile per envelope', async () => {
    await renderPage();

    expect(await screen.findByText('enums.accountType.PEA')).toBeInTheDocument();
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
    const user = userEvent.setup();
    await renderPage();

    await user.click(await screen.findByRole('radio', { name: 'chart.range.5y' }));

    await vi.waitFor(() =>
      httpTesting
        .match((request) => request.url === '/api/history')[0]
        ?.flush({ mode: 'constant-mix', reconstructed: true, points: [] }),
    );
    await vi.waitFor(() =>
      httpTesting
        .match((request) => request.url === '/api/portfolio/performance')[0]
        ?.flush({ ...performance, range: '5y', reconstructed: true }),
    );

    expect(await screen.findByTestId('reconstructed-warning')).toBeInTheDocument();
  });

  it('should show an error message when the portfolio fails to load', async () => {
    await renderPage((request) => request.flush(null, { status: 500, statusText: 'Server Error' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('should not reload the intraday history when the current range is re-picked', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(await screen.findByRole('radio', { name: 'chart.range.1d' }));

    expect(httpTesting.match((request) => request.url === '/api/history/intraday')).toHaveLength(0);
  });

  it('should request the constant-mix history and performance when a range is picked', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(await screen.findByRole('radio', { name: 'chart.range.max' }));

    await vi.waitFor(() => {
      const pending = httpTesting.match((request) => request.url === '/api/history');
      expect(pending).toHaveLength(1);
      pending[0]?.flush(emptyHistory);
    });
    await vi.waitFor(() => {
      const pending = httpTesting.match((request) => request.url === '/api/portfolio/performance');
      expect(pending).toHaveLength(1);
      pending[0]?.flush({ ...performance, range: 'max' });
    });
  });

  it('should summarize the curve for assistive technology once points are available', async () => {
    const points: IntradayHistoryResponse = {
      points: [
        { at: '2026-08-27T09:00:00Z', totalEur: 278000 },
        { at: '2026-08-27T18:00:00Z', totalEur: 278146.45 },
      ],
    };
    await renderPage(undefined, points);

    expect(await screen.findByRole('img', { name: 'portfolio.chartSummary' })).toBeInTheDocument();
  });

  it('should format the 1d axis in the locale-appropriate hour style', async () => {
    const points: IntradayHistoryResponse = {
      points: [
        { at: '2026-08-27T09:00:00Z', totalEur: 278000 },
        { at: '2026-08-27T18:00:00Z', totalEur: 278146.45 },
      ],
    };
    await renderPage(undefined, points, getTranslocoTestingModule(), 'en-GB');

    const ticks = await screen.findAllByTestId('chart-axis-tick');

    expect(ticks[0]?.textContent?.trim()).toMatch(/^\d{1,2}:\d{2}$/);
  });

  it('should format the 1d axis with the French hour marker', async () => {
    const points: IntradayHistoryResponse = {
      points: [
        { at: '2026-08-27T09:00:00Z', totalEur: 278000 },
        { at: '2026-08-27T18:00:00Z', totalEur: 278146.45 },
      ],
    };
    await renderPage(undefined, points, getTranslocoTestingModule(), 'fr-FR');

    const ticks = await screen.findAllByTestId('chart-axis-tick');

    expect(ticks[0]?.textContent?.trim()).toMatch(/^\d{1,2} h$/);
  });

  it('should mark the range change and the curve as busy while the new range is loading', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(await screen.findByRole('radio', { name: 'chart.range.max' }));

    expect((await screen.findByTestId('hero-period')).getAttribute('aria-busy')).toBe('true');

    await vi.waitFor(() => {
      const pending = httpTesting.match((request) => request.url === '/api/history');
      expect(pending).toHaveLength(1);
      pending[0]?.flush(emptyHistory);
    });
    await vi.waitFor(() => {
      const pending = httpTesting.match((request) => request.url === '/api/portfolio/performance');
      expect(pending).toHaveLength(1);
      pending[0]?.flush({ ...performance, range: 'max' });
    });

    expect(await screen.findByTestId('hero-period')).toHaveAttribute('aria-busy', 'false');
  });

  it('should re-translate the range options when the active language changes', async () => {
    await renderPage(
      undefined,
      emptyIntraday,
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

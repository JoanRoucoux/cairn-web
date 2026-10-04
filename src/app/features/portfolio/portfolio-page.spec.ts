import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';
import { type RenderResult, render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import type { HistoryResponse, PortfolioResponse } from '@core/api-client/cairnAPI.schemas';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { PortfolioCurve } from './curve/portfolio-curve';
import { PortfolioEnvelopes } from './envelopes/portfolio-envelopes';
import { PortfolioPage } from './portfolio-page';
import { PortfolioStore } from './portfolio-store';

const portfolio = {
  totalEur: 152318.64,
  dayChangeEur: -396.07,
  dayChangeRatio: -0.0026,
  unrealizedGainEur: null,
  unrealizedGainRatio: null,
  staleCount: 2,
  generatedAt: '2026-08-21T20:00:00Z',
  byAssetClass: [],
  byAccount: [],
  holdings: [{ id: 'h1' }],
} as unknown as PortfolioResponse;

const holdings = [
  {
    id: 'h1',
    instrumentName: 'Amundi MSCI World',
    accountName: 'PEA',
    marketValueEur: 100,
    dayChangeEur: 12.5,
    dayChangeRatio: 0.0125,
  },
];

const performance = {
  range: '1m',
  from: '2026-07-21',
  to: '2026-08-21',
  reconstructed: false,
  lastPriceAt: '2026-08-21T16:32:00Z',
  total: { valueEur: 152318.64, changeEur: -396.07, changeRatio: -0.0026 },
  byEnvelope: [{ accountType: 'PEA', valueEur: 152318.64, share: 1, changeEur: -396.07, changeRatio: -0.0026 }],
};

const history: HistoryResponse = {
  mode: 'constant-mix',
  reconstructed: false,
  points: [
    { date: '2026-08-20', totalEur: 278859.43 },
    { date: '2026-08-21', totalEur: 152318.64 },
  ],
};
const emptyHistory: HistoryResponse = { mode: 'constant-mix', reconstructed: false, points: [] };

describe('PortfolioPage', () => {
  let httpTesting: HttpTestingController;

  const renderPage = async (
    respondToPortfolio: (request: ReturnType<HttpTestingController['expectOne']>) => void = (request) =>
      request.flush(portfolio),
    respondToPerformance: (request: ReturnType<HttpTestingController['expectOne']>) => void = (request) =>
      request.flush(performance),
    respondToHistory: (request: ReturnType<HttpTestingController['expectOne']>) => void = (request) =>
      request.flush(history),
    respondToHoldings: (request: ReturnType<HttpTestingController['expectOne']>) => void = (request) =>
      request.flush(holdings),
  ): Promise<RenderResult<PortfolioPage>> => {
    const rendered = await render(PortfolioPage, {
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'en-GB' },
        provideTranslocoScope('portfolio'),
        PortfolioStore,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    respondToPortfolio(httpTesting.expectOne((request) => request.url === '/api/portfolio'));
    respondToHoldings(httpTesting.expectOne((request) => request.url === '/api/holdings'));
    await vi.waitFor(() => respondToHistory(httpTesting.expectOne((request) => request.url === '/api/history')));
    await vi.waitFor(() =>
      respondToPerformance(httpTesting.expectOne((request) => request.url === '/api/portfolio/performance')),
    );

    return rendered;
  };

  afterEach(() => httpTesting.verify());

  it('should display the total portfolio value', async () => {
    await renderPage();

    expect(await screen.findByTestId('total-value')).toHaveTextContent('€152,318.64');
  });

  it('should display one envelope row per envelope', async () => {
    await renderPage();

    expect(await screen.findByText('enums.accountType.PEA')).toBeInTheDocument();
  });

  it('should render the curve', async () => {
    await renderPage();

    expect(await screen.findByRole('img')).toBeInTheDocument();
  });

  it('should render the movers', async () => {
    await renderPage();

    expect((await screen.findAllByText('Amundi MSCI World')).length).toBeGreaterThan(0);
  });

  it('should render only portfolio-empty when the portfolio has no holding', async () => {
    await renderPage((request) => request.flush({ ...portfolio, holdings: [] }));

    expect(await screen.findByText('portfolio.empty.title')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('should show only the total block in error when the portfolio call fails, keeping the others', async () => {
    await renderPage((request) => request.flush(null, { status: 500, statusText: 'Server Error' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('portfolio.total.error');
    expect(await screen.findByRole('img')).toBeInTheDocument();
    expect(await screen.findByText('enums.accountType.PEA')).toBeInTheDocument();
    expect((await screen.findAllByText('Amundi MSCI World')).length).toBeGreaterThan(0);
  });

  it('should show only the movers block in error when the holdings call fails, keeping the total', async () => {
    await renderPage(undefined, undefined, undefined, (request) =>
      request.flush(null, { status: 500, statusText: 'Server Error' }),
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('portfolio.movers.error');
    expect(await screen.findByTestId('total-value')).toBeInTheDocument();
  });

  it('should show the page-level error only when every call fails', async () => {
    await renderPage(
      (request) => request.flush(null, { status: 500, statusText: 'Server Error' }),
      (request) => request.flush(null, { status: 500, statusText: 'Server Error' }),
      (request) => request.flush(null, { status: 500, statusText: 'Server Error' }),
      (request) => request.flush(null, { status: 500, statusText: 'Server Error' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('portfolio.pageError');
    expect(screen.getByRole('alert').closest('ui-alert')).not.toHaveClass('ui-enter-fade');
  });

  it('should recover a failed block once its retry is pressed', async () => {
    const user = userEvent.setup();
    await renderPage((request) => request.flush(null, { status: 500, statusText: 'Server Error' }));

    await user.click(await screen.findByRole('button', { name: 'portfolio.error.retry' }));

    httpTesting.expectOne((request) => request.url === '/api/portfolio').flush(portfolio);
    await vi.waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('should request the intraday history and the performance for the one-day range', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(await screen.findByRole('radio', { name: 'chart.range.1d' }));

    await vi.waitFor(() => {
      const pending = httpTesting.match((request) => request.url === '/api/history/intraday');
      expect(pending).toHaveLength(1);
      pending[0]?.flush({ points: [] });
    });
    await vi.waitFor(() => {
      const pending = httpTesting.match((request) => request.url === '/api/portfolio/performance');
      expect(pending).toHaveLength(1);
      pending[0]?.flush({ ...performance, range: '1d' });
    });
  });

  it('should request the constant-mix history and the performance for a picked range beyond one day', async () => {
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

  it('should date the Max range from its first point, on the curve and on the envelopes', async () => {
    const user = userEvent.setup();
    const { fixture } = await renderPage();
    const since = (type: typeof PortfolioCurve | typeof PortfolioEnvelopes): string | null =>
      (fixture.debugElement.query(By.directive(type)).componentInstance as PortfolioCurve | PortfolioEnvelopes).since();

    expect(since(PortfolioCurve)).toBeNull();

    await user.click(await screen.findByRole('radio', { name: 'chart.range.max' }));
    await vi.waitFor(() =>
      httpTesting
        .expectOne((request) => request.url === '/api/history')
        .flush({
          ...history,
          points: [
            { date: '2019-03-01', totalEur: 80000 },
            { date: '2026-08-21', totalEur: 152318.64 },
          ],
        }),
    );
    await vi.waitFor(() =>
      httpTesting
        .expectOne((request) => request.url === '/api/portfolio/performance')
        .flush({ ...performance, range: 'max' }),
    );

    await vi.waitFor(() => expect(since(PortfolioCurve)).toBe('March 2019'));
    expect(since(PortfolioEnvelopes)).toBe('March 2019');
  });

  it('should leave the Max range undated while it has no point', async () => {
    const user = userEvent.setup();
    const { fixture } = await renderPage();

    await user.click(await screen.findByRole('radio', { name: 'chart.range.max' }));
    await vi.waitFor(() => httpTesting.expectOne((request) => request.url === '/api/history').flush(emptyHistory));
    await vi.waitFor(() =>
      httpTesting
        .expectOne((request) => request.url === '/api/portfolio/performance')
        .flush({ ...performance, range: 'max' }),
    );

    await vi.waitFor(() =>
      expect(
        (fixture.debugElement.query(By.directive(PortfolioEnvelopes)).componentInstance as PortfolioEnvelopes).range(),
      ).toBe('max'),
    );
    expect(
      (fixture.debugElement.query(By.directive(PortfolioEnvelopes)).componentInstance as PortfolioEnvelopes).since(),
    ).toBeNull();
  });

  it('should retry only the history call when the curve alone failed', async () => {
    const user = userEvent.setup();
    await renderPage(undefined, undefined, (request) =>
      request.flush(null, { status: 500, statusText: 'Server Error' }),
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('portfolio.curve.error');

    await user.click(screen.getByRole('button', { name: 'portfolio.error.retry' }));

    httpTesting.expectOne((request) => request.url === '/api/history').flush(history);
    await vi.waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('should recover once the movers block retry is pressed', async () => {
    const user = userEvent.setup();
    await renderPage(undefined, undefined, undefined, (request) =>
      request.flush(null, { status: 500, statusText: 'Server Error' }),
    );

    await user.click(await screen.findByRole('button', { name: 'portfolio.error.retry' }));

    httpTesting.expectOne((request) => request.url === '/api/holdings').flush(holdings);
    await vi.waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('should retry only the performance call when the envelopes alone failed', async () => {
    const user = userEvent.setup();
    await renderPage(undefined, (request) => request.flush(null, { status: 500, statusText: 'Server Error' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('portfolio.envelopes.error');

    await user.click(screen.getByRole('button', { name: 'portfolio.error.retry' }));

    httpTesting.expectOne((request) => request.url === '/api/portfolio/performance').flush(performance);
    await vi.waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });
});

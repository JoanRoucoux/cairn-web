import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { SourceListPage } from './source-list-page';
import { SourceListStore } from './source-list-store';

const holdings = [
  { id: 'h1', priceSource: 'YAHOO', priceAsOf: '2026-08-21', stale: false },
  { id: 'h2', priceSource: 'SG_SIRIUS', priceAsOf: '2026-08-17', stale: true },
  { id: 'h3', priceSource: 'MANUAL', priceAsOf: null, stale: false },
] as unknown as HoldingResponse[];

const runs = [{ id: 1, jobName: 'refresh-quotes', status: 'COMPLETED', startedAt: '2026-08-21T08:00:00Z' }];

describe('SourceListPage', () => {
  let httpTesting: HttpTestingController;

  const renderPage = async (): Promise<Awaited<ReturnType<typeof render>>> => {
    const result = await render(SourceListPage, {
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'en-GB' },
        provideTranslocoScope('sources'),
        SourceListStore,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.expectOne('/api/holdings').flush(holdings);
    await vi.waitFor(() => httpTesting.match((request) => request.url.startsWith('/api/jobs/runs'))[0]?.flush([]));

    return result;
  };

  afterEach(() => httpTesting.verify());

  it('should list the price sources', async () => {
    await renderPage();

    expect(await screen.findByText('YAHOO')).toBeInTheDocument();
    expect(screen.getByText('SG_SIRIUS')).toBeInTheDocument();
  });

  it('should mark a stale source without relying on color alone', async () => {
    await renderPage();

    expect(await screen.findByRole('img', { name: 'sources.stale' })).toBeInTheDocument();
  });

  it('should tell there is no run yet', async () => {
    await renderPage();

    expect(await screen.findByText('sources.noRun')).toBeInTheDocument();
  });

  it('should list recent batch runs', async () => {
    await render(SourceListPage, {
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'en-GB' },
        provideTranslocoScope('sources'),
        SourceListStore,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.expectOne('/api/holdings').flush(holdings);
    await vi.waitFor(() => httpTesting.match((request) => request.url.startsWith('/api/jobs/runs'))[0]?.flush(runs));

    expect(await screen.findByText('refresh-quotes')).toBeInTheDocument();
  });

  it('should refresh quotes and announce the report', async () => {
    const user = userEvent.setup();
    await renderPage();
    await screen.findByText('YAHOO');

    await user.click(screen.getByTestId('refresh-quotes'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/quotes/refresh'))).flush({
      refreshed: 21,
      skipped: 3,
      failures: [{ instrumentId: 'i1', instrumentName: 'ETF', source: 'YAHOO', message: 'timeout' }],
    });
    await vi.waitFor(() => httpTesting.expectOne('/api/holdings').flush(holdings));
    await vi.waitFor(() => httpTesting.match((request) => request.url.startsWith('/api/jobs/runs'))[0]?.flush([]));

    expect(await screen.findByTestId('refresh-report')).toHaveTextContent('sources.report');
    expect(await screen.findByTestId('refresh-failures')).toHaveTextContent('ETF');
    expect(screen.getByTestId('refresh-failures')).toHaveTextContent('timeout');
  });

  it('should not show a failure list when nothing failed', async () => {
    const user = userEvent.setup();
    await renderPage();
    await screen.findByText('YAHOO');

    await user.click(screen.getByTestId('refresh-quotes'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/quotes/refresh'))).flush({
      refreshed: 21,
      skipped: 3,
      failures: [],
    });
    await vi.waitFor(() => httpTesting.expectOne('/api/holdings').flush(holdings));
    await vi.waitFor(() => httpTesting.match((request) => request.url.startsWith('/api/jobs/runs'))[0]?.flush([]));

    await screen.findByTestId('refresh-report');
    expect(screen.queryByTestId('refresh-failures')).not.toBeInTheDocument();
  });

  it('should show no sources when the holdings fail to load', async () => {
    await render(SourceListPage, {
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'en-GB' },
        provideTranslocoScope('sources'),
        SourceListStore,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.expectOne('/api/holdings').flush('boom', { status: 500, statusText: 'Server error' });
    await vi.waitFor(() => httpTesting.match((request) => request.url.startsWith('/api/jobs/runs'))[0]?.flush([]));

    expect(await screen.findByText('sources.statusTitle')).toBeInTheDocument();
    expect(screen.queryByText('YAHOO')).not.toBeInTheDocument();
  });

  it('should tell the user when the refresh could not be started', async () => {
    const user = userEvent.setup();
    await renderPage();
    await screen.findByText('YAHOO');

    await user.click(screen.getByTestId('refresh-quotes'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/quotes/refresh'))).flush('boom', {
      status: 500,
      statusText: 'Server error',
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('sources.refreshError');
  });
});

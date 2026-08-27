import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { of } from 'rxjs';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingDetailPage } from './holding-detail-page';
import { HoldingDetailStore } from './holding-detail-store';

const holding = {
  id: 'h1',
  instrumentId: 'i1',
  instrumentName: 'BNP Paribas Easy S&P 500',
  isin: 'FR0011550185',
  accountName: 'Saxo Investor',
  accountType: 'PEA',
  assetClass: 'ETF',
  quantity: 676,
  price: 33.3069,
  averageCost: 26.654,
  marketValueEur: 22515.47,
  unrealizedGainEur: 4497.36,
  priceSource: 'YAHOO',
  priceAsOf: '2026-08-21',
  stale: false,
};

describe('HoldingDetailPage', () => {
  let httpTesting: HttpTestingController;

  const settle = async (): Promise<void> => {
    for (let i = 0; i < 10; i++) {
      TestBed.tick();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  };

  const renderPage = async (
    holdingId = 'h1',
    instrument: { description: string; externalUrl?: string } = {
      description: 'ETF tracking the S&P 500.',
      externalUrl: 'https://example.test/ese',
    },
  ): Promise<void> => {
    await render(HoldingDetailPage, {
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'en-GB' },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ holdingId })) } },
        provideTranslocoScope('holdings'),
        provideTranslocoScope('portfolio'),
        HoldingDetailStore,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.expectOne('/api/holdings').flush([holding]);
    await settle();
    httpTesting
      .match((request) => request.url === '/api/instruments/i1')
      .forEach((request) => request.flush(instrument));
    httpTesting.match((request) => request.url.includes('/quotes')).forEach((request) => request.flush([]));
    await settle();
  };

  afterEach(() => httpTesting.verify());

  it('should name the holding', async () => {
    await renderPage();

    expect(await screen.findByRole('heading', { name: 'BNP Paribas Easy S&P 500' })).toBeInTheDocument();
  });

  it('should answer what the instrument is', async () => {
    await renderPage();

    expect(await screen.findByText('ETF tracking the S&P 500.')).toBeInTheDocument();
  });

  it('should link out to the provider factsheet in a new tab', async () => {
    await renderPage();

    const link = await screen.findByRole('link', { name: /holdings.externalLink/ });
    expect(link).toHaveAttribute('href', 'https://example.test/ese');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should not link out when the instrument has no external factsheet', async () => {
    await renderPage('h1', { description: 'Manually priced instrument.' });

    expect(screen.queryByRole('link', { name: /holdings.externalLink/ })).not.toBeInTheDocument();
  });

  it('should tell the user when the holding does not exist', async () => {
    await renderPage('nope');

    expect(await screen.findByRole('alert')).toHaveTextContent('holdings.notFound');
  });

  it('should ignore a request to price a holding that does not exist', async () => {
    const { fixture } = await render(HoldingDetailPage, {
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'en-GB' },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ holdingId: 'nope' })) } },
        provideTranslocoScope('holdings'),
        provideTranslocoScope('portfolio'),
        HoldingDetailStore,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.expectOne('/api/holdings').flush([holding]);
    await settle();

    fixture.componentInstance['onEnterQuote']();

    expect(screen.queryByTestId('manual-quote-dialog')).not.toBeInTheDocument();
  });

  it('should request new quotes when a range is picked', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(await screen.findByRole('radio', { name: 'portfolio.range.max' }));

    await vi.waitFor(() => {
      const pending = httpTesting.match((request) => request.url.includes('/quotes'));
      expect(pending).toHaveLength(1);
      pending[0]?.flush([]);
    });
  });

  it('should open and dismiss the manual quote dialog', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(await screen.findByTestId('enter-quote'));
    expect(screen.getByTestId('manual-quote-dialog')).toBeInTheDocument();

    await user.click(screen.getByTestId('manual-quote-cancel'));
    expect(screen.queryByTestId('manual-quote-dialog')).not.toBeInTheDocument();
  });

  it('should reload the holding once a manual quote is saved', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(await screen.findByTestId('enter-quote'));
    await user.type(screen.getByTestId('manual-quote-price'), '33.3069');
    await user.click(screen.getByTestId('manual-quote-submit'));

    await vi.waitFor(() => httpTesting.expectOne('/api/instruments/i1/quotes').flush({}));

    await vi.waitFor(() => expect(screen.queryByTestId('manual-quote-dialog')).not.toBeInTheDocument());
    httpTesting.expectOne('/api/holdings').flush([holding]);
    await settle();
    httpTesting.match((request) => request.url.includes('/quotes')).forEach((request) => request.flush([]));
    await settle();
  });
});

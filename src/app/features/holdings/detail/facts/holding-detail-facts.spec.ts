import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';

import { render, screen } from '@testing-library/angular';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingDetailFacts } from './holding-detail-facts';

const holding = {
  quantity: 2,
  averageCost: 10,
  price: 12,
  priceCurrency: 'EUR',
  priceAsOf: '2026-09-25',
  stale: false,
  assetClass: 'ETF',
  isin: 'LU1681043599',
} as HoldingResponse;

const renderFacts = (overrides: Record<string, unknown> = {}): ReturnType<typeof render> =>
  render('<dl app-holding-detail-facts [holding]="holding" priceSourceLabel="Yahoo"></dl>', {
    componentProperties: { holding: { ...holding, ...overrides } },
    imports: [HoldingDetailFacts, getTranslocoTestingModule()],
    providers: [provideZonelessChangeDetection(), { provide: LOCALE_ID, useValue: 'en-GB' }],
  });

describe('HoldingDetailFacts', () => {
  it('adds the time of the quote once the API gives the fetch instant', async () => {
    await renderFacts({ priceFetchedAt: '2026-09-25T15:35:00Z' });

    expect(await screen.findByTestId('quote-line')).toHaveTextContent('holdings.detail.quoteAt');
  });

  it('gives the date only without a fetch instant, or for a fund', async () => {
    await renderFacts({ assetClass: 'FUND', priceFetchedAt: '2026-09-25T15:35:00Z' });

    expect(await screen.findByTestId('quote-line')).toHaveTextContent('holdings.detail.quoteOn');
  });

  it('gives the date only when the API sends no fetch instant', async () => {
    await renderFacts();

    expect(await screen.findByTestId('quote-line')).toHaveTextContent('holdings.detail.quoteOn');
  });

  it('shows the quote in its own currency', async () => {
    await renderFacts({ priceCurrency: 'USD', price: 12 });
    const row = (await screen.findByText('holdings.columns.price')).parentElement!;

    expect(row).toHaveTextContent('US$12.00');
  });

  it('labels a crypto identifier as a symbol and never invents one', async () => {
    await renderFacts({ isin: null, assetClass: 'CRYPTO' });
    const row = (await screen.findByText('holdings.detail.symbol')).parentElement!;

    expect(row).toHaveTextContent('—');
  });

  it('keeps the ISIN label for a security without ISIN', async () => {
    await renderFacts({ isin: null });
    const row = (await screen.findByText('holdings.detail.isin')).parentElement!;

    expect(row).toHaveTextContent('—');
  });

  it('omits the quote line when there is no quote', async () => {
    await renderFacts({ priceAsOf: null, price: null });
    await screen.findByText('holdings.columns.price');

    expect(screen.queryByTestId('quote-line')).not.toBeInTheDocument();
  });
});

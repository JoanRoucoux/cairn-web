import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';

import { render, screen } from '@testing-library/angular';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingDetailFacts } from './holding-detail-facts';

const holding = {
  quantity: 2,
  averageCost: 10,
  price: 12,
  priceAsOf: '2026-09-25T15:40:00Z',
  stale: false,
  assetClass: 'ETF',
  isin: 'LU1681043599',
} as HoldingResponse;

const renderFacts = (
  overrides: Partial<HoldingResponse> = {},
  symbol: string | null = null,
): ReturnType<typeof render> =>
  render(HoldingDetailFacts, {
    inputs: { holding: { ...holding, ...overrides }, priceSourceLabel: 'Yahoo', symbol },
    imports: [getTranslocoTestingModule()],
    providers: [provideZonelessChangeDetection(), { provide: LOCALE_ID, useValue: 'en-GB' }],
  });

describe('HoldingDetailFacts', () => {
  it('adds the time of the quote when the API gives one', async () => {
    await renderFacts();

    expect(await screen.findByTestId('quote-line')).toHaveTextContent('holdings.detail.quoteAt');
  });

  it('gives the date only for a fund or a date-only quote', async () => {
    await renderFacts({ assetClass: 'FUND' });

    expect(await screen.findByTestId('quote-line')).toHaveTextContent('holdings.detail.quoteOn');
  });

  it('falls back to the symbol of the instrument when there is no ISIN', async () => {
    await renderFacts({ isin: null, assetClass: 'CRYPTO' }, 'ETH');

    expect(await screen.findByText('ETH')).toBeInTheDocument();
    expect(screen.getByText('holdings.detail.symbol')).toBeInTheDocument();
  });

  it('omits the quote line when there is no quote', async () => {
    await renderFacts({ priceAsOf: null, price: null });
    await screen.findByText('holdings.columns.price');

    expect(screen.queryByTestId('quote-line')).not.toBeInTheDocument();
  });
});

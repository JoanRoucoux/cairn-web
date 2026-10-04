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
  render('<app-holding-detail-facts [holding]="holding" priceSourceLabel="Yahoo" />', {
    componentProperties: { holding: { ...holding, ...overrides } },
    imports: [HoldingDetailFacts, getTranslocoTestingModule()],
    providers: [provideZonelessChangeDetection(), { provide: LOCALE_ID, useValue: 'en-GB' }],
  });

describe('HoldingDetailFacts', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('rules the list with a hairline from the desktop breakpoint, and follows the viewport', async () => {
    const listeners: ((event: { matches: boolean }) => void)[] = [];
    const query = {
      matches: true,
      addEventListener: (_: string, callback: (event: { matches: boolean }) => void) => listeners.push(callback),
      removeEventListener: () => undefined,
    };
    vi.stubGlobal('matchMedia', (media: string) =>
      media === '(min-width: 1024px)'
        ? query
        : { matches: false, addEventListener: () => undefined, removeEventListener: () => undefined },
    );
    await renderFacts();
    const list = (await screen.findByText('holdings.columns.quantity')).closest('dl')!;

    expect(list.className).toContain('inset_0_1px_0');

    query.matches = false;
    listeners.forEach((listener) => listener(query));

    await vi.waitFor(() => expect(list.className).not.toContain('inset_0_1px_0'));
  });

  it('adds the time of the quote once the API gives the fetch instant', async () => {
    await renderFacts({ priceFetchedAt: '2026-09-25T15:35:00Z' });

    expect(await screen.findByText(/holdings.detail.quoteAt/)).toBeInTheDocument();
  });

  it('gives the date only without a fetch instant, or for a fund', async () => {
    await renderFacts({ assetClass: 'FUND', priceFetchedAt: '2026-09-25T15:35:00Z' });

    expect(await screen.findByText(/holdings.detail.quoteOn/)).toBeInTheDocument();
  });

  it('gives the date only when the quote day is not the fetch day in Paris', async () => {
    await renderFacts({ priceAsOf: '2026-09-24', priceFetchedAt: '2026-09-25T15:35:00Z' });

    expect(await screen.findByText(/holdings.detail.quoteOn/)).toBeInTheDocument();
  });

  it('compares the days in Paris, not in UTC', async () => {
    await renderFacts({ priceAsOf: '2026-09-26', priceFetchedAt: '2026-09-25T22:30:00Z' });

    expect(await screen.findByText(/holdings.detail.quoteAt/)).toBeInTheDocument();
  });

  it('gives the date only when the API sends no fetch instant', async () => {
    await renderFacts();

    expect(await screen.findByText(/holdings.detail.quoteOn/)).toBeInTheDocument();
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

  it('shows the symbol of a crypto when the API gives one', async () => {
    await renderFacts({ isin: null, symbol: 'ETH', assetClass: 'CRYPTO' });
    const row = (await screen.findByText('holdings.detail.symbol')).parentElement!;

    expect(row).toHaveTextContent('ETH');
  });

  it('shows the ISIN, not a symbol, for a security that has both', async () => {
    await renderFacts({ symbol: 'CW8' });
    const row = (await screen.findByText('holdings.detail.isin')).parentElement!;

    expect(row).toHaveTextContent('LU1681043599');
    expect(row).not.toHaveTextContent('CW8');
  });

  it('keeps the ISIN label for a security without ISIN', async () => {
    await renderFacts({ isin: null });
    const row = (await screen.findByText('holdings.detail.isin')).parentElement!;

    expect(row).toHaveTextContent('—');
  });

  it('says there is no quote yet instead of a date', async () => {
    await renderFacts({ priceAsOf: null, price: null });
    const row = (await screen.findByText('holdings.columns.price')).parentElement!;

    expect(row).toHaveTextContent('holdings.noQuote');
    expect(screen.queryByText(/holdings.(detail.quote|staleLate)/)).not.toBeInTheDocument();
  });

  it('dates the quote without naming its source, which has a row of its own', async () => {
    await renderFacts();
    const price = (await screen.findByText('holdings.columns.price')).parentElement!;
    const source = screen.getByText('holdings.detail.priceSource').parentElement!;

    expect(price).not.toHaveTextContent('Yahoo');
    expect(source).toHaveTextContent('Yahoo');
    expect(source).not.toHaveTextContent('holdings.detail.noAutomaticQuote');
  });

  it('says a manual price is never fetched automatically', async () => {
    await renderFacts({ priceSource: 'MANUAL' });
    const source = (await screen.findByText('holdings.detail.priceSource')).parentElement!;

    expect(source).toHaveTextContent('holdings.detail.noAutomaticQuote');
  });
});

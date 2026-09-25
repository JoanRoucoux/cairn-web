import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';

import { render, screen } from '@testing-library/angular';

import type { PerformanceTotalResponse } from '@core/api-client/cairnAPI.schemas';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { PortfolioHero } from './portfolio-hero';

const total: PerformanceTotalResponse = { valueEur: 298_889.12, changeEur: -712.98, changeRatio: -0.0026 };

const renderHero = (overrides: Partial<Record<string, unknown>> = {}): ReturnType<typeof render> =>
  render(PortfolioHero, {
    imports: [getTranslocoTestingModule()],
    inputs: {
      total,
      range: '1d',
      points: [],
      unrealizedGainEur: null,
      dayChangeEur: -712.98,
      lastPriceAt: '2026-08-21T16:32:00Z',
      ...overrides,
    },
    providers: [provideZonelessChangeDetection(), { provide: LOCALE_ID, useValue: 'en-GB' }],
  });

describe('PortfolioHero', () => {
  it('should display the total value without cents so it fits a narrow card', async () => {
    await renderHero();

    expect(screen.getByTestId('hero-value')).toHaveTextContent('€298,889');
  });

  it('should name the period for the selected range', async () => {
    await renderHero({ range: '1m' });

    expect(screen.getByTestId('hero-period')).toHaveTextContent('portfolio.hero.period.1m');
  });

  it('should render a dash for an unknown unrealized gain', async () => {
    await renderHero({ unrealizedGainEur: null });

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('should show when the price was last updated, in Paris time', async () => {
    await renderHero();

    expect(screen.getByTestId('updated-at')).toHaveTextContent('portfolio.hero.updatedAt');
  });

  it('should show nothing when the last price time is unknown', async () => {
    await renderHero({ lastPriceAt: null });

    expect(screen.queryByTestId('updated-at')).not.toBeInTheDocument();
  });

  it('should hide the day change on the one-day range, since it repeats the hero delta', async () => {
    await renderHero({ range: '1d' });

    expect(screen.queryByText('portfolio.hero.day')).not.toBeInTheDocument();
  });

  it('should show the day change alongside the range change beyond one day', async () => {
    await renderHero({ range: '1m' });

    expect(screen.getByText('portfolio.hero.day')).toBeInTheDocument();
  });

  it('should mark the range change as busy while the range is reloading, without blanking the total', async () => {
    await renderHero({ loading: true });

    expect(screen.getByTestId('hero-value')).toHaveTextContent('€298,889');
    expect(screen.getByTestId('hero-period')).toHaveAttribute('aria-busy', 'true');
  });

  it('should not mark the range change as busy once it has settled', async () => {
    await renderHero({ loading: false });

    expect(screen.getByTestId('hero-period')).toHaveAttribute('aria-busy', 'false');
  });

  it('should show the sparkline while the range is loaded', async () => {
    const { container } = await renderHero();

    expect(container.querySelector('app-line-chart')).not.toBeNull();
  });

  it('should blank the range change, the ratio and the sparkline when the range failed to load, without blanking the total', async () => {
    const { container } = await renderHero({ rangeError: true });

    expect(container.querySelector('app-line-chart')).toBeNull();

    expect(screen.getByTestId('hero-value')).toHaveTextContent('€298,889');
    expect(screen.getByTestId('hero-change')).toHaveTextContent('—');
    expect(screen.getByTestId('hero-period')).not.toHaveTextContent('%');
  });
});

import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';

import { render, screen } from '@testing-library/angular';

import type { EnvelopePerformanceResponse } from '@core/api-client/cairnAPI.schemas';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { EnvelopeCard } from './envelope-card';

const envelopes: EnvelopePerformanceResponse[] = [
  { accountType: 'PEA', valueEur: 200_000, share: 0.7, changeEur: 500, changeRatio: 0.0025 },
  { accountType: 'CRYPTO', valueEur: 78_146.45, share: 0.3, changeEur: -1212.98, changeRatio: null },
];

const renderCard = (
  input: EnvelopePerformanceResponse[] = envelopes,
  overrides: Partial<Record<string, unknown>> = {},
): ReturnType<typeof render> =>
  render(EnvelopeCard, {
    imports: [getTranslocoTestingModule()],
    inputs: { envelopes: input, ...overrides },
    providers: [provideZonelessChangeDetection(), { provide: LOCALE_ID, useValue: 'en-GB' }],
  });

describe('EnvelopeCard', () => {
  it('should title the card', async () => {
    await renderCard();

    expect(screen.getByRole('heading', { name: 'portfolio.envelopes.title' })).toBeInTheDocument();
  });

  it('should render one row per envelope, in the order received', async () => {
    await renderCard();

    const items = screen.getAllByRole('listitem');

    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('enums.accountType.PEA');
    expect(items[1]).toHaveTextContent('enums.accountType.CRYPTO');
  });

  it('should display each envelope value, range change and share of total in the same row', async () => {
    await renderCard();

    const [first] = screen.getAllByRole('listitem');

    expect(first).toHaveTextContent('€200,000.00');
    expect(first).toHaveTextContent('+€500.00');
    expect(first).toHaveTextContent('70.0% portfolio.envelopes.share');
  });

  it('should never truncate a long envelope label', async () => {
    const longLabel: EnvelopePerformanceResponse[] = [
      { accountType: 'LIFE_INSURANCE', valueEur: 9_100, share: 0.034, changeEur: 10, changeRatio: 0.0011 },
    ];
    await renderCard(longLabel);

    const label = screen.getByText('enums.accountType.LIFE_INSURANCE');

    expect(label).not.toHaveClass('truncate');
  });

  it('should render no row when there are no envelopes', async () => {
    await renderCard([]);

    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('should mark the deltas as busy while the range is reloading, without blanking the value', async () => {
    await renderCard(envelopes, { loading: true });

    const [first] = screen.getAllByRole('listitem');

    expect(first).toHaveTextContent('€200,000.00');
    expect(first?.querySelector('[aria-busy]')).toHaveAttribute('aria-busy', 'true');
  });

  it('should blank every delta when the range failed to load, without blanking the value or the share', async () => {
    await renderCard(envelopes, { rangeError: true });

    const [first] = screen.getAllByRole('listitem');

    expect(first).toHaveTextContent('€200,000.00');
    expect(first).toHaveTextContent('70.0% portfolio.envelopes.share');
    expect(first).toHaveTextContent('—');
  });
});

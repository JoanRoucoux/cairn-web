import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';

import { render, screen } from '@testing-library/angular';

import type { EnvelopePerformanceResponse } from '@core/api-client/cairnAPI.schemas';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { EnvelopeTiles } from './envelope-tiles';

const envelopes: EnvelopePerformanceResponse[] = [
  { accountType: 'PEA', valueEur: 200_000, share: 0.7, changeEur: 500, changeRatio: 0.0025 },
  { accountType: 'CRYPTO', valueEur: 78_146.45, share: 0.3, changeEur: -1212.98, changeRatio: null },
];

const renderTiles = (input: EnvelopePerformanceResponse[] = envelopes): ReturnType<typeof render> =>
  render(EnvelopeTiles, {
    imports: [getTranslocoTestingModule()],
    inputs: { envelopes: input, range: '1d' },
    providers: [provideZonelessChangeDetection(), { provide: LOCALE_ID, useValue: 'en-GB' }],
  });

describe('EnvelopeTiles', () => {
  it('should render one tile per envelope, in the order received', async () => {
    await renderTiles();

    const items = screen.getAllByRole('listitem');

    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('enums.accountType.PEA');
    expect(items[1]).toHaveTextContent('enums.accountType.CRYPTO');
  });

  it('should display each envelope value and range change', async () => {
    await renderTiles();

    expect(screen.getByText('€200,000.00')).toBeInTheDocument();
    expect(screen.getByText('+€500.00')).toBeInTheDocument();
  });

  it('should render nothing when there are no envelopes', async () => {
    await renderTiles([]);

    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });
});

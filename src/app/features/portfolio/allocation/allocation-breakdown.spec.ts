import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';

import { render, screen } from '@testing-library/angular';

import type { AllocationResponse } from '@core/api-client/cairnAPI.schemas';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { AllocationBreakdown } from './allocation-breakdown';

const rows: AllocationResponse[] = [
  { label: 'Funds', valueEur: 128656, share: 0.463 },
  { label: 'Equities', valueEur: 110424, share: 0.397 },
  { label: 'Crypto', valueEur: 10525, share: 0.038 },
];

const renderBreakdown = (data: AllocationResponse[] = rows): ReturnType<typeof render> =>
  render(AllocationBreakdown, {
    inputs: { rows: data, heading: 'By asset class' },
    imports: [getTranslocoTestingModule()],
    providers: [provideZonelessChangeDetection(), { provide: LOCALE_ID, useValue: 'en-GB' }],
  });

describe('AllocationBreakdown', () => {
  it('should render one meter per row', async () => {
    await renderBreakdown();

    expect(await screen.findAllByRole('meter')).toHaveLength(3);
  });

  it('should scale bars against the largest row, not the total', async () => {
    await renderBreakdown();

    // 0.038 / 0.463 = 8.2% of the widest bar, not 3.8% of the container.
    expect(screen.getByRole('meter', { name: 'Crypto' })).toHaveAttribute('aria-valuenow', '0.0821');
  });

  it('should read out the share and the amount rather than the scaled fraction', async () => {
    await renderBreakdown();

    expect(screen.getByRole('meter', { name: 'Crypto' })).toHaveAttribute('aria-valuetext', '3.8% - €10,525.00');
  });

  it('should survive a portfolio worth nothing without dividing by zero', async () => {
    await renderBreakdown([{ label: 'Cash', valueEur: 0, share: 0 }]);

    expect(screen.getByRole('meter', { name: 'Cash' })).toHaveAttribute('aria-valuenow', '0');
  });

  it('should cycle through the ramp when there are more rows than steps', async () => {
    const many = Array.from({ length: 7 }, (_, index) => ({
      label: `Row ${index}`,
      valueEur: 100,
      share: 0.1,
    })) as AllocationResponse[];

    await renderBreakdown(many);

    expect(await screen.findAllByRole('meter')).toHaveLength(7);
  });
});

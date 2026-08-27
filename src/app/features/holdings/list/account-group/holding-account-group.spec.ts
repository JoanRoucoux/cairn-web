import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { render, screen } from '@testing-library/angular';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import type { AccountGroup } from '../holding-list-store';
import { HoldingAccountGroup } from './holding-account-group';

const group: AccountGroup = {
  accountId: 'a1',
  accountName: 'Esalia',
  accountType: 'PEE',
  valueEur: 119258,
  unrealizedGainEur: null,
  stale: true,
  holdings: [
    {
      id: 'h3',
      instrumentName: 'FCPE Actions',
      quantity: 412.5,
      price: 289.11,
      marketValueEur: 119258,
      unrealizedGainEur: null,
      averageCost: null,
      stale: true,
    },
  ],
} as unknown as AccountGroup;

const renderGroup = (input: AccountGroup = group, expanded = true): ReturnType<typeof render> =>
  render(HoldingAccountGroup, {
    inputs: { group: input, expanded },
    imports: [getTranslocoTestingModule()],
    providers: [provideZonelessChangeDetection(), provideRouter([]), { provide: LOCALE_ID, useValue: 'en-GB' }],
  });

describe('HoldingAccountGroup', () => {
  it('should name the account and its envelope', async () => {
    await renderGroup();

    expect(await screen.findByText('Esalia')).toBeInTheDocument();
    expect(screen.getByText(/PEE/)).toBeInTheDocument();
  });

  it('should mark a stale account with an icon, not with colour alone', async () => {
    await renderGroup();

    expect(await screen.findByLabelText('holdings.staleQuote')).toBeInTheDocument();
  });

  it('should not mark a fresh account', async () => {
    await renderGroup({ ...group, stale: false });

    expect(screen.queryByLabelText('holdings.staleQuote')).not.toBeInTheDocument();
  });

  it('should render a dash for an unknown subtotal', async () => {
    const { container } = await renderGroup();

    expect(container.textContent).toContain('—');
  });

  it('should show the average cost when known', async () => {
    await renderGroup({
      ...group,
      holdings: [{ ...group.holdings[0], averageCost: 250.5 } as (typeof group.holdings)[0]],
    });

    expect(await screen.findByText('€250.50')).toBeInTheDocument();
  });

  it('should link each line to its detail screen', async () => {
    await renderGroup();

    expect(await screen.findByRole('link', { name: /FCPE Actions/ })).toHaveAttribute('href', '/positions/h3');
  });

  it('should name every column', async () => {
    await renderGroup();

    expect(await screen.findAllByRole('columnheader')).toHaveLength(6);
  });

  it('should hold the secondary columns back on a narrow viewport', async () => {
    await renderGroup();

    expect(screen.getByRole('columnheader', { name: 'holdings.columns.averageCost' })).toHaveClass(
      'hidden',
      'lg:table-cell',
    );
    expect(screen.getByRole('columnheader', { name: 'holdings.columns.value' })).not.toHaveClass('hidden');
  });

  it('should start collapsed when asked', async () => {
    const { container } = await renderGroup(group, false);

    expect(container.querySelector('details')).not.toHaveAttribute('open');
  });
});

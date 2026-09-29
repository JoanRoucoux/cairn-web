import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import type { AccountGroup } from '../holding-list-store';
import { HoldingAccountGroup } from './holding-account-group';

const group: AccountGroup = {
  accountId: 'a1',
  accountName: 'Esalia',
  accountType: 'PEE',
  institution: 'Amundi ESR',
  valueEur: 119258,
  cashEur: 0,
  unvaluedCount: 0,
  unrealizedGainEur: null,
  stale: true,
  holdings: [
    {
      id: 'h3',
      instrumentName: 'FCPE Actions',
      assetClass: 'FUND',
      quantity: 412.5,
      price: 289.11,
      priceAsOf: '2026-09-24',
      marketValueEur: 119258,
      unrealizedGainEur: null,
      unrealizedGainRatio: null,
      averageCost: null,
      dayChangeRatio: null,
      stale: true,
    },
  ],
} as unknown as AccountGroup;

const renderGroup = (
  input: AccountGroup = group,
  expanded = true,
  compact = false,
  selectedHoldingId: string | undefined = undefined,
): ReturnType<typeof render> =>
  render(HoldingAccountGroup, {
    inputs: { group: input, expanded, compact, selectedHoldingId },
    imports: [getTranslocoTestingModule()],
    providers: [provideZonelessChangeDetection(), provideRouter([]), { provide: LOCALE_ID, useValue: 'en-GB' }],
  });

describe('HoldingAccountGroup', () => {
  it('should name the account, its envelope and its institution', async () => {
    await renderGroup();

    expect(await screen.findByText('Esalia')).toBeInTheDocument();
    expect(screen.getByText(/enums\.accountType\.PEE/)).toBeInTheDocument();
    expect(screen.getByText(/Amundi ESR/)).toBeInTheDocument();
  });

  it('announces the account name on the toggle, which sits outside it next to the cash button', async () => {
    const { container } = await renderGroup();
    await screen.findByText('Esalia');

    expect(container.querySelector('summary')).toHaveAccessibleName(/Esalia/);
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

  it('should show the asset class as a badge under the instrument name', async () => {
    await renderGroup();

    expect(await screen.findByText('enums.assetClass.FUND')).toBeInTheDocument();
  });

  it('should show the stale date instead of a day change', async () => {
    await renderGroup();

    expect(await screen.findAllByText('holdings.staleShort')).not.toHaveLength(0);
  });

  it('should show the day change ratio and the unrealized gain ratio for a fresh, valued line', async () => {
    await renderGroup({
      ...group,
      holdings: [
        {
          ...group.holdings[0],
          stale: false,
          dayChangeRatio: 0.0125,
          unrealizedGainRatio: 0.084,
        } as (typeof group.holdings)[0],
      ],
    });

    expect(await screen.findAllByText('+1.25%')).not.toHaveLength(0);
    expect(await screen.findAllByText('+8.40%')).not.toHaveLength(0);
  });

  it('should render a dash for an unvalued line instead of an empty or zero cell', async () => {
    await renderGroup({
      ...group,
      holdings: [
        { ...group.holdings[0], price: null, marketValueEur: null, stale: false } as (typeof group.holdings)[0],
      ],
    });

    const rows = await screen.findAllByTestId('holding-row');
    const row = rows[0]!;

    expect(row.textContent).toContain('—');
    expect(row.textContent).not.toContain('€0.00');
    expect(row.textContent).toContain('holdings.manualQuote.open');
  });

  it('should signal the unvalued lines folded out of an account subtotal', async () => {
    await renderGroup({ ...group, unvaluedCount: 2 });

    expect(await screen.findByText('holdings.unvaluedCount_other')).toBeInTheDocument();
  });

  it('should not signal unvalued lines when every line has a value', async () => {
    await renderGroup();

    expect(screen.queryByText(/unvaluedCount/)).not.toBeInTheDocument();
  });

  it('should link each line to its detail screen and preserve the query params', async () => {
    await renderGroup();

    const links = await screen.findAllByRole('link', { name: /FCPE Actions/ });

    for (const link of links) {
      expect(link).toHaveAttribute('href', '/holdings/h3');
    }
  });

  it('should show the full seven columns when not compact', async () => {
    await renderGroup();

    expect(await screen.findAllByRole('columnheader')).toHaveLength(7);
  });

  it('should show only three columns when compact', async () => {
    await renderGroup(group, true, true);

    expect(await screen.findAllByRole('columnheader')).toHaveLength(3);
  });

  it('should highlight the open row', async () => {
    await renderGroup(group, true, false, 'h3');

    const rows = await screen.findAllByTestId('holding-row');

    expect(rows[0]).toHaveClass('bg-(--soft)');
  });

  it('should emit the account whose cash balance is edited from the desktop row', async () => {
    const user = userEvent.setup();
    const { fixture } = await renderGroup();
    const emitted = vi.fn();
    fixture.componentInstance.editCash.subscribe(emitted);

    await user.click((await screen.findAllByTestId('edit-cash'))[0]!);

    expect(emitted).toHaveBeenCalledWith(group.accountId);
  });

  it('should emit the account whose cash balance is edited from the mobile row', async () => {
    const user = userEvent.setup();
    const { fixture } = await renderGroup();
    const emitted = vi.fn();
    fixture.componentInstance.editCash.subscribe(emitted);

    await user.click((await screen.findAllByTestId('edit-cash-mobile'))[0]!);

    expect(emitted).toHaveBeenCalledWith(group.accountId);
  });

  it('should render the cash line as the last row, muted when empty', async () => {
    await renderGroup();

    const rows = await screen.findAllByTestId('cash-row');

    expect(rows[0]).toHaveTextContent('€0.00');
  });

  it('should render the cash line with the account balance when it has one', async () => {
    await renderGroup({ ...group, cashEur: 732.4 });

    const rows = await screen.findAllByTestId('cash-row');

    expect(rows[0]).toHaveTextContent('€732.40');
  });

  it('should start collapsed when asked', async () => {
    const { container } = await renderGroup(group, false);

    expect(container.querySelector('details')).not.toHaveAttribute('open');
  });
});

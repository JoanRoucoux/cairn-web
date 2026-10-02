import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import type { AccountGroup } from '../../holding-list-store';
import { HoldingAccountCard } from './holding-account-card';

const holding = {
  id: 'h3',
  instrumentName: 'FCPE Actions',
  assetClass: 'FUND',
  quantity: 412.5,
  price: 289.11,
  marketValueEur: 119258,
  unrealizedGainRatio: 0.084,
  averageCost: 250,
};

const group = {
  accountId: 'a1',
  accountName: 'Esalia',
  accountType: 'PEE',
  institution: 'Amundi ESR',
  valueEur: 119258,
  cashEur: 12,
  showCash: true,
  lineCount: 1,
  balanceAt: null,
  holdings: [holding],
} as unknown as AccountGroup;

const renderCard = (input: Partial<AccountGroup> = {}): ReturnType<typeof render<HoldingAccountCard>> =>
  render(HoldingAccountCard, {
    inputs: { group: { ...group, ...input } },
    imports: [getTranslocoTestingModule()],
    providers: [provideZonelessChangeDetection(), provideRouter([]), { provide: LOCALE_ID, useValue: 'en-GB' }],
  });

describe('HoldingAccountCard', () => {
  it('should put the name, the meta and the total in a header outside the card', async () => {
    const { container } = await renderCard();
    const header = container.querySelector('header')!;

    expect(header).toHaveTextContent('Esalia');
    expect(header).toHaveTextContent('Amundi ESR');
    expect(header).toHaveTextContent('€119,258.00');
    expect(container.querySelector('ui-card')!.contains(header)).toBe(false);
  });

  it('should add the lines left out to the meta, apart by reason', async () => {
    const { container } = await renderCard({ unvaluedCount: 1, nonEurCount: 2 });

    expect(container.querySelector('header')).toHaveTextContent(
      'holdings.lineCount_one · holdings.uncounted.noQuote_one · holdings.uncounted.nonEur_other',
    );
  });

  it('should add nothing to the meta when every line is counted or the list is filtered', async () => {
    const { container } = await renderCard({ unvaluedCount: 1, filtered: { accountValueEur: 1, rowCount: 1 } });

    expect(container.querySelector('header')).not.toHaveTextContent('uncounted');
  });

  it('should show the quantity times the quote and the unrealized ratio on a line', async () => {
    await renderCard();
    const row = await screen.findByTestId('holding-row-mobile');

    expect(row).toHaveTextContent('412.5 × €289.11');
    expect(row).toHaveTextContent('+8.40%');
    expect(row).toHaveAttribute('href', '/holdings/h3');
  });

  it('should say the average cost is unknown when there is no ratio', async () => {
    await renderCard({ holdings: [{ ...holding, unrealizedGainRatio: null } as never] });

    expect(await screen.findByText('holdings.averageCostUnknownShort')).toBeInTheDocument();
  });

  it('should say a stale line is late, in place of the quantity and the quote', async () => {
    await renderCard({ holdings: [{ ...holding, stale: true, priceAsOf: '2026-09-24' } as never] });
    const row = await screen.findByTestId('holding-row-mobile');

    expect(row).toHaveTextContent('holdings.staleLate');
    expect(row).not.toHaveTextContent('412.5');
  });

  it('should send an unvalued line to the quote entry through its detail', async () => {
    await renderCard({ holdings: [{ ...holding, price: null, marketValueEur: null } as never] });
    const row = await screen.findByTestId('holding-row-mobile');

    expect(row).toHaveTextContent('holdings.noQuoteToEnter');
    expect(row).toHaveTextContent('holdings.manualQuote.open');
    expect(row).toHaveAttribute('href', '/holdings/h3');
  });

  it('should end with the cash line and emit when it is edited', async () => {
    const user = userEvent.setup();
    const { fixture } = await renderCard();
    const emitted = vi.fn();
    fixture.componentInstance.editCash.subscribe(emitted);

    const cash = await screen.findByTestId('edit-cash-mobile');
    expect(cash).toHaveTextContent('holdings.cash.entered');
    await user.click(cash);

    expect(emitted).toHaveBeenCalledWith('a1');
  });

  it('should omit the cash line when the group has none', async () => {
    await renderCard({ showCash: false });
    await screen.findByTestId('holding-row-mobile');

    expect(screen.queryByTestId('edit-cash-mobile')).not.toBeInTheDocument();
  });

  describe('a savings account', () => {
    const savings = { accountType: 'SAVINGS', institution: 'Fortuneo', lineCount: 0, holdings: [] };

    it('should name its balance date in the meta, never a line count', async () => {
      const { container } = await renderCard({ ...savings, balanceAt: '2026-09-12T08:00:00Z' });

      expect(container.querySelector('header')).toHaveTextContent(
        'enums.accountType.SAVINGS · Fortuneo · holdings.balanceMeta',
      );
      expect(container.querySelector('header')).not.toHaveTextContent('lineCount');
    });

    it('should say neither a date nor a count while the balance was never set', async () => {
      const { container } = await renderCard({ ...savings, institution: '' });

      expect(container.querySelector('app-holding-account-meta')).toHaveTextContent(/^s*enums.accountType.SAVINGSs*$/);
    });

    it('should show one dated balance row that emits when edited', async () => {
      const user = userEvent.setup();
      const { fixture } = await renderCard({ ...savings, balanceAt: '2026-09-12T08:00:00Z' });
      const emitted = vi.fn();
      fixture.componentInstance.editCash.subscribe(emitted);

      const balance = await screen.findByTestId('edit-cash-mobile');

      expect(balance).toHaveTextContent('holdings.balance.line');
      expect(balance).toHaveTextContent('holdings.balance.entered');
      expect(balance).not.toHaveTextContent('holdings.cash.entered');

      await user.click(balance);

      expect(emitted).toHaveBeenCalledWith('a1');
    });

    it('should show the balance row with no date while the balance was never set', async () => {
      await renderCard(savings);

      const balance = await screen.findByTestId('edit-cash-mobile');

      expect(balance).toHaveTextContent('holdings.balance.line');
      expect(balance).not.toHaveTextContent('holdings.balance.entered');
    });
  });
});

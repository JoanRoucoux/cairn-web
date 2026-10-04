import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { UiFlipItem } from '@joanroucoux/cairn-ui/motion';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { type MotionRecord, recordMotion } from '@shared/testing/motion';
import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import type { HoldingChange } from '../../../holding-changes';
import type { AccountGroup } from '../../holding-list-store';
import { HoldingAccountCard } from './holding-account-card';

const holding = {
  id: 'h3',
  instrumentName: 'FCPE Actions',
  assetClass: 'FUND',
  quantity: 412.5,
  price: 289.11,
  marketValueEur: 60926,
  unrealizedGainRatio: 0.084,
  averageCost: 250,
};

const group = {
  accountId: 'a1',
  accountName: 'Woodgrove Savings Plan',
  accountType: 'PEE',
  institution: 'Woodgrove Bank',
  valueEur: 60926,
  cashEur: 12,
  showCash: true,
  lineCount: 1,
  balanceAt: null,
  holdings: [holding],
} as unknown as AccountGroup;

const renderCard = (
  input: Partial<AccountGroup> = {},
  flash: HoldingChange | null = null,
): ReturnType<typeof render<HoldingAccountCard>> =>
  render(HoldingAccountCard, {
    inputs: { group: { ...group, ...input }, flash },
    imports: [getTranslocoTestingModule()],
    providers: [provideZonelessChangeDetection(), provideRouter([]), { provide: LOCALE_ID, useValue: 'en-GB' }],
  });

describe('HoldingAccountCard', () => {
  it('should put the name, the meta and the total in a header outside the card', async () => {
    const { container } = await renderCard();
    const header = container.querySelector('header')!;

    expect(header).toHaveTextContent('Woodgrove Savings Plan');
    expect(header).toHaveTextContent('Woodgrove Bank');
    expect(header).toHaveTextContent('€60,926.00');
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

  it('should caption a line quoted in another currency, with a subtle dash for the value', async () => {
    await renderCard({
      holdings: [{ ...holding, priceCurrency: 'USD', marketValueEur: null, unrealizedGainRatio: null } as never],
    });
    const row = await screen.findByTestId('holding-row-mobile');

    expect(row).toHaveTextContent('holdings.foreignQuote');
    expect(row).toHaveTextContent('—');
    expect(row).not.toHaveTextContent('holdings.manualQuote.open');
    expect(row).not.toHaveTextContent('holdings.averageCostUnknownShort');
    expect(row).not.toHaveTextContent('412.5');
    expect(row.querySelectorAll('.text-body')[1]).toHaveClass('text-(--subtle-foreground)');
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
    const savings = { accountType: 'SAVINGS', institution: 'Woodgrove Bank', lineCount: 0, holdings: [] };

    it('should name its balance date in the meta, never a line count', async () => {
      const { container } = await renderCard({ ...savings, balanceAt: '2026-09-12T08:00:00Z' });

      expect(container.querySelector('header')).toHaveTextContent(
        'enums.accountType.SAVINGS · Woodgrove Bank · holdings.balanceMeta',
      );
      expect(container.querySelector('header')).not.toHaveTextContent('lineCount');
    });

    it('should say neither a date nor a count while the balance was never set', async () => {
      const { container } = await renderCard({ ...savings, institution: '' });

      expect(container.querySelector('app-holding-account-meta')).toHaveTextContent(
        /^\s*enums\.accountType\.SAVINGS\s*$/,
      );
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

  describe('after a change', () => {
    let motion: MotionRecord;

    beforeEach(() => (motion = recordMotion()));

    afterEach(() => motion.restore());

    it('should highlight the line that just changed', async () => {
      await renderCard({}, { id: 'h3', at: 1 });

      await vi.waitFor(() => expect(motion.highlighted).toEqual([screen.getByTestId('holding-row-mobile')]));
    });

    it('should highlight the cash line when its account balance just changed', async () => {
      await renderCard({}, { id: 'a1', at: 1 });

      await vi.waitFor(() => expect(motion.highlighted).toEqual([screen.getByTestId('edit-cash-mobile')]));
    });

    it('should highlight nothing when no line of the account changed', async () => {
      await renderCard({}, { id: 'elsewhere', at: 1 });

      expect(await screen.findByRole('heading', { name: 'Woodgrove Savings Plan' })).toBeInTheDocument();
      expect(motion.highlighted).toEqual([]);
    });

    it('should highlight the balance row of a savings account whose balance just changed', async () => {
      await renderCard(
        { accountType: 'SAVINGS', holdings: [], lineCount: 0, balanceAt: '2026-09-12T08:00:00Z' },
        { id: 'a1', at: 1 },
      );

      await vi.waitFor(() => expect(motion.highlighted).toEqual([screen.getByTestId('edit-cash-mobile')]));
      expect(screen.getByTestId('edit-cash-mobile')).toHaveTextContent('holdings.balance.line');
    });
  });

  describe('in a sliding list', () => {
    const flipItems = (fixture: Awaited<ReturnType<typeof renderCard>>['fixture']): HTMLElement[] =>
      fixture.debugElement.queryAll(By.directive(UiFlipItem)).map((item) => item.nativeElement as HTMLElement);

    it('should let the balance row of a savings account slide', async () => {
      const { fixture } = await renderCard({ accountType: 'SAVINGS', holdings: [], lineCount: 0 });

      expect(flipItems(fixture)).toEqual([screen.getByTestId('edit-cash-mobile')]);
    });

    it('should let a line quoted in another currency slide like the other lines', async () => {
      const { fixture } = await renderCard({
        holdings: [{ ...holding, priceCurrency: 'USD', marketValueEur: null }] as AccountGroup['holdings'],
      });

      expect(flipItems(fixture)).toContain(screen.getByTestId('holding-row-mobile'));
    });
  });
});

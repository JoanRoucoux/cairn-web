import { Component, LOCALE_ID, input, output, provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { UiFlipItem } from '@joanroucoux/cairn-ui/motion';
import { render, screen } from '@testing-library/angular';

import { type MotionRecord, recordMotion } from '@shared/testing/motion';
import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import type { HoldingChange } from '../../holding-changes';
import type { AccountGroup } from '../holding-list-store';
import { HoldingAccountGroup } from './holding-account-group';

@Component({
  selector: 'app-test-host',
  imports: [HoldingAccountGroup],
  template: `<table>
    <tbody
      app-holding-account-group
      [compact]="compact()"
      [flash]="flash()"
      [group]="group()"
      [selectedHoldingId]="selectedHoldingId()"
      (changeListing)="changeListing.emit($event)"
      (editCash)="editCash.emit($event)"
      (enterQuote)="enterQuote.emit($event)"
    ></tbody>
  </table>`,
})
class TestHost {
  readonly group = input.required<AccountGroup>();
  readonly compact = input(false);
  readonly flash = input<HoldingChange | null>(null);
  readonly selectedHoldingId = input<string | undefined>(undefined);
  readonly editCash = output<string>();
  readonly enterQuote = output<unknown>();
  readonly changeListing = output<unknown>();
}

const holding = {
  id: 'h3',
  instrumentName: 'FCPE Actions',
  isin: 'QS0009119224',
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
};

const group = {
  accountId: 'a1',
  accountName: 'Esalia',
  accountType: 'PEE',
  institution: 'Amundi ESR',
  valueEur: 119258,
  cashEur: 0,
  showCash: true,
  lineCount: 1,
  balanceAt: null,
  holdings: [holding],
} as unknown as AccountGroup;

const savings: Partial<AccountGroup> = {
  accountType: 'SAVINGS',
  holdings: [],
  lineCount: 0,
  balanceAt: '2026-09-12T08:00:00Z',
};

const renderGroup = (
  overrides: Partial<AccountGroup> = {},
  compact = false,
  selectedHoldingId: string | undefined = undefined,
  flash: HoldingChange | null = null,
): ReturnType<typeof render<TestHost>> =>
  render(TestHost, {
    inputs: { group: { ...group, ...overrides }, compact, selectedHoldingId, flash },
    imports: [getTranslocoTestingModule()],
    providers: [provideZonelessChangeDetection(), provideRouter([]), { provide: LOCALE_ID, useValue: 'en-GB' }],
  });

describe('HoldingAccountGroup after a change', () => {
  let motion: MotionRecord;

  beforeEach(() => (motion = recordMotion()));

  afterEach(() => motion.restore());

  it('should highlight the cells of the line that just changed, and nothing else', async () => {
    await renderGroup({}, false, undefined, { id: 'h3', at: 1 });

    await vi.waitFor(() => expect(motion.highlighted.length).toBeGreaterThan(0));
    expect(motion.highlighted.every((cell) => cell.closest('tr')?.querySelector('[data-holding-id="h3"]'))).toBe(true);
  });

  it('should highlight the cash line when its account balance just changed', async () => {
    await renderGroup({}, false, undefined, { id: 'a1', at: 1 });

    await vi.waitFor(() => expect(motion.highlighted.length).toBeGreaterThan(0));
    expect(motion.highlighted.every((cell) => cell.closest('tr')?.getAttribute('data-testid') === 'cash-row')).toBe(
      true,
    );
  });

  it('should highlight nothing when no line of the account changed', async () => {
    await renderGroup({}, false, undefined, { id: 'elsewhere', at: 1 });

    expect(await screen.findByRole('heading', { name: 'Esalia' })).toBeInTheDocument();
    expect(motion.highlighted).toEqual([]);
  });

  it('should highlight the balance row of a savings account whose balance just changed', async () => {
    await renderGroup(savings, false, undefined, { id: 'a1', at: 1 });

    await vi.waitFor(() => expect(motion.highlighted.length).toBeGreaterThan(0));
    expect(motion.highlighted.every((cell) => cell.closest('tr')?.getAttribute('data-testid') === 'cash-row')).toBe(
      true,
    );
    expect(screen.getByTestId('cash-row')).toHaveTextContent('holdings.balance.line');
  });
});

describe('HoldingAccountGroup in a sliding list', () => {
  const flipItems = (fixture: Awaited<ReturnType<typeof renderGroup>>['fixture']): HTMLElement[] =>
    fixture.debugElement.queryAll(By.directive(UiFlipItem)).map((item) => item.nativeElement as HTMLElement);

  it('should let the band and the balance row of a savings account slide with the other groups', async () => {
    const { fixture } = await renderGroup(savings);

    expect(flipItems(fixture)).toEqual([
      screen.getByRole('heading', { name: 'Esalia' }).closest('tr'),
      screen.getByTestId('cash-row'),
    ]);
  });

  it('should let a line quoted in another currency slide like the other lines', async () => {
    const { fixture } = await renderGroup({
      holdings: [{ ...holding, priceCurrency: 'USD', marketValueEur: null }] as AccountGroup['holdings'],
    });

    expect(flipItems(fixture)).toContain(screen.getByTestId('holding-row'));
  });
});

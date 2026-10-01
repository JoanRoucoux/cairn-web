import { Component, LOCALE_ID, input, output, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import type { AccountGroup } from '../holding-list-store';
import { HoldingAccountGroup } from './holding-account-group';

@Component({
  selector: 'app-test-host',
  imports: [HoldingAccountGroup],
  template: `<table>
    <tbody
      app-holding-account-group
      [compact]="compact()"
      [group]="group()"
      [selectedHoldingId]="selectedHoldingId()"
      (editCash)="editCash.emit($event)"
      (enterQuote)="enterQuote.emit($event)"
    ></tbody>
  </table>`,
})
class TestHost {
  readonly group = input.required<AccountGroup>();
  readonly compact = input(false);
  readonly selectedHoldingId = input<string | undefined>(undefined);
  readonly editCash = output<string>();
  readonly enterQuote = output<unknown>();
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
  bookletCount: 0,
  unvaluedCount: 0,
  stale: true,
  holdings: [holding],
} as unknown as AccountGroup;

const renderGroup = (
  overrides: Partial<AccountGroup> = {},
  compact = false,
  selectedHoldingId: string | undefined = undefined,
): ReturnType<typeof render<TestHost>> =>
  render(TestHost, {
    inputs: { group: { ...group, ...overrides }, compact, selectedHoldingId },
    imports: [getTranslocoTestingModule()],
    providers: [provideZonelessChangeDetection(), provideRouter([]), { provide: LOCALE_ID, useValue: 'en-GB' }],
  });

describe('HoldingAccountGroup', () => {
  it('should open with a band naming the account, its envelope, its institution and its line count', async () => {
    await renderGroup();

    expect(await screen.findByRole('heading', { name: 'Esalia' })).toBeInTheDocument();
    expect(screen.getByText(/enums\.accountType\.PEE/)).toHaveTextContent(
      'enums.accountType.PEE · Amundi ESR · holdings.lineCount_one',
    );
  });

  it('should count booklets, not lines, for a savings account', async () => {
    await renderGroup({ accountType: 'SAVINGS', lineCount: 0, bookletCount: 2 });

    expect(await screen.findByText(/holdings\.bookletCount_other/)).toBeInTheDocument();
  });

  it('should show the account total in the band', async () => {
    await renderGroup();

    expect(await screen.findByRole('heading', { name: 'Esalia' })).toBeInTheDocument();
    expect(document.querySelector('td[ui-group-cell]')).toHaveTextContent('€119,258.00');
  });

  it('should show the ISIN and the class as the subtitle', async () => {
    await renderGroup();

    expect(await screen.findByText(/QS0009119224/)).toHaveTextContent('QS0009119224 · enums.assetClass.FUND');
  });

  it('should show the quantity, the average cost and the quote without a euro sign', async () => {
    await renderGroup({ holdings: [{ ...holding, averageCost: 250.5, stale: false } as never] });
    const cells = (await screen.findByTestId('holding-row')).querySelectorAll('td');

    expect(cells[1]).toHaveTextContent('412.5');
    expect(cells[2]).toHaveTextContent(/^\s*250\.50\s*$/);
    expect(cells[3]).toHaveTextContent(/^\s*289\.11\s*$/);
  });

  it('should show the stale date under the quote', async () => {
    await renderGroup();

    expect(await screen.findAllByText('holdings.staleShort')).not.toHaveLength(0);
  });

  it('should show the value in medium weight, then the gain with its ratio and the day change in regular weight', async () => {
    await renderGroup({
      holdings: [
        {
          ...holding,
          stale: false,
          dayChangeRatio: 0.0125,
          unrealizedGainEur: 100,
          unrealizedGainRatio: 0.084,
        } as never,
      ],
    });
    const row = await screen.findByTestId('holding-row');

    expect(row.querySelectorAll('td')[4]).toHaveClass('font-medium');
    expect(row.querySelectorAll('td')[5]).not.toHaveClass('font-medium');
    expect(row).toHaveTextContent('+€100.00');
    expect(row).toHaveTextContent('+8.40%');
    expect(row).toHaveTextContent('+1.25%');
  });

  it('should render a dash for an unvalued line instead of an empty or zero cell', async () => {
    await renderGroup({ holdings: [{ ...holding, price: null, marketValueEur: null, stale: false } as never] });
    const row = await screen.findByTestId('holding-row');

    expect(row.textContent).toContain('—');
    expect(row.textContent).not.toContain('€0.00');
    expect(row.textContent).toContain('holdings.manualQuote.open');
  });

  it('should caption an unquoted line with no quote when the detail is open', async () => {
    await renderGroup({ holdings: [{ ...holding, price: null, marketValueEur: null, stale: false } as never] }, true);

    expect(await screen.findByText('holdings.noQuote')).toBeInTheDocument();
  });

  it('should show no day change on a stale line and keep the stale date in the stale tone', async () => {
    await renderGroup({ holdings: [{ ...holding, dayChangeRatio: 0.01 } as never] });
    const row = await screen.findByTestId('holding-row');

    expect(row.querySelectorAll('td')[6]).toBeEmptyDOMElement();
    expect(row.querySelectorAll('td')[3]).toHaveTextContent('holdings.staleShort');
  });

  it('should offer to enter a quote from the Cours column of an unvalued line', async () => {
    const user = userEvent.setup();
    const { fixture } = await renderGroup({
      holdings: [{ ...holding, price: null, marketValueEur: null, stale: false } as never],
    });
    const entered = vi.fn();
    fixture.componentInstance.enterQuote.subscribe(entered);

    await user.click(await screen.findByTestId('enter-quote'));

    expect(entered).toHaveBeenCalledWith(expect.objectContaining({ id: 'h3' }));
    await user.click(screen.getByTestId('enter-quote-narrow'));

    expect(entered).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('enter-quote-narrow')).toHaveClass('lg:hidden');
    expect(screen.getByText('holdings.noQuoteToEnter')).toBeInTheDocument();
  });

  it('should link each line to its detail screen', async () => {
    await renderGroup();

    expect(await screen.findByRole('link', { name: 'FCPE Actions' })).toHaveAttribute('href', '/holdings/h3');
  });

  it('should show seven cells per row when not compact', async () => {
    await renderGroup();

    expect((await screen.findByTestId('holding-row')).querySelectorAll('td')).toHaveLength(7);
  });

  it('should keep three cells per row when compact', async () => {
    await renderGroup({}, true);

    expect((await screen.findByTestId('holding-row')).querySelectorAll('td')).toHaveLength(3);
  });

  it('should mark the open row selected and current', async () => {
    await renderGroup({}, false, 'h3');

    expect(await screen.findByTestId('holding-row')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('link', { name: 'FCPE Actions' })).toHaveAttribute('aria-current', 'true');
  });

  it('should list a booklet with the Livret subtitle and no quantity or quote', async () => {
    await renderGroup({
      accountType: 'SAVINGS',
      holdings: [{ ...holding, instrumentName: 'Livret A', isin: null, assetClass: 'CASH', stale: false } as never],
    });
    const row = await screen.findByTestId('holding-row');

    expect(row).toHaveTextContent('holdings.booklet');
    expect(row.querySelectorAll('td')[1]).toBeEmptyDOMElement();
    expect(row.querySelectorAll('td')[3]).toBeEmptyDOMElement();
  });

  it('should end with the cash line captioned as an entered balance, even at zero', async () => {
    await renderGroup();
    const row = await screen.findByTestId('cash-row');

    expect(row).toHaveTextContent('holdings.cash.entered');
    expect(row).toHaveTextContent('€0.00');
  });

  it('should show the cash balance when the account has one', async () => {
    await renderGroup({ cashEur: 732.4 });

    expect(await screen.findByTestId('cash-row')).toHaveTextContent('€732.40');
  });

  it('should omit the cash line when the group has none', async () => {
    await renderGroup({ showCash: false });
    await screen.findByTestId('holding-row');

    expect(screen.queryByTestId('cash-row')).not.toBeInTheDocument();
  });

  it('should emit the account whose cash balance is edited', async () => {
    const user = userEvent.setup();
    const { fixture } = await renderGroup();
    const emitted = vi.fn();
    fixture.componentInstance.editCash.subscribe(emitted);

    await user.click(await screen.findByTestId('edit-cash'));

    expect(emitted).toHaveBeenCalledWith('a1');
  });
});

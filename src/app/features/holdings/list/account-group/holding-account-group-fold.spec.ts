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
      [collapsed]="!expanded()"
      [expanded]="expanded()"
      [group]="group()"
      [toggleDisabled]="toggleDisabled()"
      (expandedChange)="expandedChange.emit($event)"
    ></tbody>
  </table>`,
})
class TestHost {
  readonly group = input.required<AccountGroup>();
  readonly expanded = input(true);
  readonly toggleDisabled = input(false);
  readonly expandedChange = output<boolean>();
}

const group = {
  accountId: 'a1',
  accountName: 'Woodgrove Savings Plan',
  accountType: 'PEE',
  institution: 'Woodgrove Bank',
  valueEur: 60926,
  cashEur: 0,
  showCash: true,
  lineCount: 1,
  balanceAt: null,
  holdings: [{ id: 'h3', instrumentName: 'FCPE Actions', assetClass: 'FUND', quantity: 1, stale: false }],
} as unknown as AccountGroup;

const renderGroup = (
  fold: { expanded?: boolean; toggleDisabled?: boolean } = {},
): ReturnType<typeof render<TestHost>> =>
  render(TestHost, {
    inputs: { group, expanded: true, toggleDisabled: false, ...fold },
    imports: [getTranslocoTestingModule()],
    providers: [provideZonelessChangeDetection(), provideRouter([]), { provide: LOCALE_ID, useValue: 'en-GB' }],
  });

describe('HoldingAccountGroup folding', () => {
  const band = (): Promise<HTMLElement> => screen.findByRole('button', { name: /^Woodgrove Savings Plan/ });

  it('should make the band a button inside the heading that controls the group', async () => {
    await renderGroup();
    const button = await band();

    expect(button.closest('h2')).not.toBeNull();
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAttribute('aria-controls', 'holdings-group-a1');
    expect(document.querySelector('tbody')).toHaveAttribute('id', 'holdings-group-a1');
  });

  it('should ask to fold the group when the band is clicked', async () => {
    const user = userEvent.setup();
    const { fixture } = await renderGroup();
    const emitted = vi.fn();
    fixture.componentInstance.expandedChange.subscribe(emitted);

    await user.click(await band());

    expect(emitted).toHaveBeenCalledWith(false);
  });

  it('should hide the rows of a folded group and keep them in the table', async () => {
    await renderGroup({ expanded: false });

    expect(await band()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('holding-row')).toHaveAttribute('hidden');
    expect(screen.getByTestId('cash-row')).toHaveAttribute('hidden');
    expect(screen.getByRole('heading', { name: /^Woodgrove Savings Plan/ })).toBeVisible();
  });

  it('should keep the band announced but inert while a filter holds the group open', async () => {
    const user = userEvent.setup();
    const { fixture } = await renderGroup({ toggleDisabled: true });
    const emitted = vi.fn();
    fixture.componentInstance.expandedChange.subscribe(emitted);
    const button = await band();

    await user.click(button);

    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(emitted).not.toHaveBeenCalled();
  });
});

import { Component, LOCALE_ID, booleanAttribute, computed, inject, input, output } from '@angular/core';

import { UI_AMOUNT_MASKED, UiAmount, formatAmount } from '@joanroucoux/cairn-ui/amount';
import { UiFlipItem, UiHighlight } from '@joanroucoux/cairn-ui/motion';
import { UiCellSub, UiGroup, UiGroupCell, UiRowLink, UiTd, UiTr } from '@joanroucoux/cairn-ui/table';
import { TranslocoPipe } from '@jsverse/transloco';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { ShortDatePipe } from '@shared/format/short-date-pipe';

import type { HoldingChange } from '../../holding-changes';
import type { AccountGroup } from '../holding-list-store';
import { cashRowKeys, filteredCount, metaParts } from './group-count';
import { HoldingAccountGroupRow } from './row/holding-account-group-row';

@Component({
  selector: 'tbody[app-holding-account-group]',
  imports: [
    HoldingAccountGroupRow,
    ShortDatePipe,
    TranslocoPipe,
    UiAmount,
    UiCellSub,
    UiFlipItem,
    UiGroupCell,
    UiHighlight,
    UiRowLink,
    UiTd,
    UiTr,
  ],
  templateUrl: './holding-account-group.html',
  hostDirectives: [UiGroup],
  host: {
    class: 'scroll-mt-4',
    'data-testid': 'account-group',
    '[attr.data-account-id]': 'group().accountId',
  },
})
export class HoldingAccountGroup {
  readonly group = input.required<AccountGroup>();
  readonly compact = input(false, { transform: booleanAttribute });
  readonly selectedHoldingId = input<string | undefined>(undefined);
  readonly highlight = input<object | null>(null);
  readonly flash = input<HoldingChange | null>(null);

  readonly editCash = output<string>();
  readonly enterQuote = output<HoldingResponse>();
  readonly changeListing = output<HoldingResponse>();

  readonly #locale = inject(LOCALE_ID);
  readonly #masked = inject(UI_AMOUNT_MASKED);

  protected readonly cashRowKeys = cashRowKeys;
  protected readonly filteredCount = filteredCount;
  protected readonly metaParts = metaParts;
  protected readonly accountTotal = computed(() =>
    formatAmount(this.group().filtered?.accountValueEur, { locale: this.#locale, currency: 'EUR' }, this.#masked()),
  );
}

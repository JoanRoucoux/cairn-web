import { Component, LOCALE_ID, booleanAttribute, computed, inject, input, output } from '@angular/core';

import {
  UI_AMOUNT_MASKED,
  UiAmount,
  UiCellSub,
  UiGroup,
  UiGroupCell,
  UiRowLink,
  UiTd,
  UiTr,
  formatAmount,
} from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { ShortDatePipe } from '@shared/format/short-date-pipe';

import type { AccountGroup } from '../holding-list-store';
import { cashRowKeys, filteredCount, groupCount, isSavings, nonEurMeta, unvaluedMeta } from './group-count';
import { HoldingAccountGroupRow } from './row/holding-account-group-row';

@Component({
  selector: 'tbody[app-holding-account-group]',
  imports: [
    HoldingAccountGroupRow,
    ShortDatePipe,
    TranslocoPipe,
    UiAmount,
    UiCellSub,
    UiGroupCell,
    UiRowLink,
    UiTd,
    UiTr,
  ],
  templateUrl: './holding-account-group.html',
  hostDirectives: [UiGroup],
  host: { 'data-testid': 'account-group', '[attr.data-account-id]': 'group().accountId' },
})
export class HoldingAccountGroup {
  readonly group = input.required<AccountGroup>();
  readonly compact = input(false, { transform: booleanAttribute });
  readonly selectedHoldingId = input<string | undefined>(undefined);

  readonly editCash = output<string>();
  readonly enterQuote = output<HoldingResponse>();

  readonly #locale = inject(LOCALE_ID);
  readonly #masked = inject(UI_AMOUNT_MASKED);

  protected readonly cashRowKeys = cashRowKeys;
  protected readonly filteredCount = filteredCount;
  protected readonly groupCount = groupCount;
  protected readonly isSavings = isSavings;
  protected readonly nonEurMeta = nonEurMeta;
  protected readonly unvaluedMeta = unvaluedMeta;
  protected readonly accountTotal = computed(() =>
    formatAmount(this.group().filtered?.accountValueEur, { locale: this.#locale, currency: 'EUR' }, this.#masked()),
  );
}

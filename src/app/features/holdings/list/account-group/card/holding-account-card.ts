import { Component, booleanAttribute, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiAmount } from '@joanroucoux/cairn-ui/amount';
import { UiCard } from '@joanroucoux/cairn-ui/card';
import { UiDelta } from '@joanroucoux/cairn-ui/delta';
import { UiGroupHeader } from '@joanroucoux/cairn-ui/group-header';
import { UiFlipItem, UiHighlight } from '@joanroucoux/cairn-ui/motion';
import { UiRow } from '@joanroucoux/cairn-ui/row';
import { TranslocoPipe } from '@jsverse/transloco';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { decimalPlaces } from '@shared/format/decimal-places';
import { RatioPipe } from '@shared/format/ratio-pipe';
import { ShortDatePipe } from '@shared/format/short-date-pipe';

import { foreignCurrencyOf } from '../../../foreign-currency';
import type { HoldingChange } from '../../../holding-changes';
import { isMissing } from '../../../is-missing';
import type { AccountGroup } from '../../holding-list-store';
import { cashRowKeys } from '../group-count';
import { injectGroupMeta } from '../group-meta';

@Component({
  selector: 'app-holding-account-card',
  imports: [
    RatioPipe,
    RouterLink,
    ShortDatePipe,
    TranslocoPipe,
    UiAmount,
    UiCard,
    UiDelta,
    UiFlipItem,
    UiGroupHeader,
    UiHighlight,
    UiRow,
  ],
  templateUrl: './holding-account-card.html',
  host: {
    class: 'flex scroll-mt-4 flex-col gap-2',
    'data-testid': 'account-card',
    '[attr.data-account-id]': 'group().accountId',
  },
})
export class HoldingAccountCard {
  readonly group = input.required<AccountGroup>();
  readonly flash = input<HoldingChange | null>(null);
  readonly expanded = input(true, { transform: booleanAttribute });
  readonly toggleDisabled = input(false, { transform: booleanAttribute });

  readonly editCash = output<string>();
  readonly expandedChange = output<boolean>();

  protected readonly bodyId = computed(() => `holdings-card-${this.group().accountId}`);
  protected readonly meta = injectGroupMeta(this.group);

  protected readonly decimalPlaces = decimalPlaces;
  protected readonly cashRowKeys = cashRowKeys;
  protected readonly foreignCurrency = foreignCurrencyOf;
  protected readonly unpriced = (holding: HoldingResponse): boolean => isMissing(holding.price);
}

import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiAmount } from '@joanroucoux/cairn-ui/amount';
import { UiCard } from '@joanroucoux/cairn-ui/card';
import { UiDelta } from '@joanroucoux/cairn-ui/delta';
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
import { HoldingAccountMeta } from './meta/holding-account-meta';

@Component({
  selector: 'app-holding-account-card',
  imports: [
    HoldingAccountMeta,
    RatioPipe,
    RouterLink,
    ShortDatePipe,
    TranslocoPipe,
    UiAmount,
    UiCard,
    UiDelta,
    UiFlipItem,
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
  readonly highlight = input<object | null>(null);
  readonly flash = input<HoldingChange | null>(null);

  readonly editCash = output<string>();

  protected readonly decimalPlaces = decimalPlaces;
  protected readonly cashRowKeys = cashRowKeys;
  protected readonly foreignCurrency = foreignCurrencyOf;
  protected readonly unpriced = (holding: HoldingResponse): boolean => isMissing(holding.price);
}

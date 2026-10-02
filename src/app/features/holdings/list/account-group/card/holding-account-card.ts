import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiAmount, UiCard, UiDelta, UiRow } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { decimalPlaces } from '@shared/format/decimal-places';
import { RatioPipe } from '@shared/format/ratio-pipe';
import { ShortDatePipe } from '@shared/format/short-date-pipe';

import { isMissing } from '../../../is-missing';
import { type AccountGroup } from '../../holding-list-store';
import { cashRowKeys } from '../group-count';
import { HoldingAccountMeta } from './meta/holding-account-meta';

@Component({
  selector: 'app-holding-account-card',
  imports: [HoldingAccountMeta, RatioPipe, RouterLink, ShortDatePipe, TranslocoPipe, UiAmount, UiCard, UiDelta, UiRow],
  templateUrl: './holding-account-card.html',
  host: {
    class: 'flex flex-col gap-2',
    'data-testid': 'account-card',
    '[attr.data-account-id]': 'group().accountId',
  },
})
export class HoldingAccountCard {
  readonly group = input.required<AccountGroup>();

  readonly editCash = output<string>();

  protected readonly decimalPlaces = decimalPlaces;
  protected readonly cashRowKeys = cashRowKeys;
  protected readonly unpriced = (holding: HoldingResponse): boolean => isMissing(holding.price);
}

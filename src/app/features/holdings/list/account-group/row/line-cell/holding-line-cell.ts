import { Component, booleanAttribute, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiAmount } from '@joanroucoux/cairn-ui/amount';
import { UiCellSub, UiRowLink } from '@joanroucoux/cairn-ui/table';
import { TranslocoPipe } from '@jsverse/transloco';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { decimalPlaces } from '@shared/format/decimal-places';
import { ShortDatePipe } from '@shared/format/short-date-pipe';

import { foreignCurrencyOf } from '../../../../foreign-currency';
import { isMissing } from '../../../../is-missing';

@Component({
  selector: 'td[app-holding-line-cell]',
  imports: [RouterLink, ShortDatePipe, TranslocoPipe, UiAmount, UiCellSub, UiRowLink],
  templateUrl: './holding-line-cell.html',
})
export class HoldingLineCell {
  readonly holding = input.required<HoldingResponse>();
  readonly compact = input(false, { transform: booleanAttribute });
  readonly open = input(false, { transform: booleanAttribute });

  protected readonly decimalPlaces = decimalPlaces;
  protected readonly foreignCurrency = computed(() => foreignCurrencyOf(this.holding()));
  protected readonly unpriced = computed(() => isMissing(this.holding().price));
}

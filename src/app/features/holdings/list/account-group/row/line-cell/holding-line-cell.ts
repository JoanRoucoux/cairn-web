import { Component, booleanAttribute, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiCellSub, UiRowLink } from '@joanroucoux/cairn-ui/table';
import { TranslocoPipe } from '@jsverse/transloco';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { foreignCurrencyOf } from '../../../../foreign-currency';

@Component({
  selector: 'td[app-holding-line-cell]',
  imports: [RouterLink, TranslocoPipe, UiCellSub, UiRowLink],
  templateUrl: './holding-line-cell.html',
})
export class HoldingLineCell {
  readonly holding = input.required<HoldingResponse>();
  readonly open = input(false, { transform: booleanAttribute });

  protected readonly foreignCurrency = computed(() => foreignCurrencyOf(this.holding()));
  protected readonly manual = computed(() => this.holding().priceSource === 'MANUAL');
}

import { Component, computed, input } from '@angular/core';

import { UiAmount, UiDelta } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { AmountSeparator } from '@shared/format/amount-separator';
import { RatioPipe } from '@shared/format/ratio-pipe';

import { foreignCurrencyOf } from '../../foreign-currency';

@Component({
  selector: 'app-holding-detail-figures',
  imports: [AmountSeparator, RatioPipe, TranslocoPipe, UiAmount, UiDelta],
  templateUrl: './holding-detail-figures.html',
  host: { class: 'block' },
})
export class HoldingDetailFigures {
  readonly holding = input.required<HoldingResponse>();

  protected readonly foreign = computed(() => foreignCurrencyOf(this.holding()) !== undefined);
}

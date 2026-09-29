import { Component, input } from '@angular/core';

import { UiAmount } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { decimalPlaces } from '@shared/format/decimal-places';
import { ShortDatePipe } from '@shared/format/short-date-pipe';

@Component({
  selector: 'app-holding-detail-facts',
  imports: [ShortDatePipe, TranslocoPipe, UiAmount],
  templateUrl: './holding-detail-facts.html',
})
export class HoldingDetailFacts {
  readonly holding = input.required<HoldingResponse>();
  readonly priceSourceLabel = input.required<string>();

  protected readonly decimalPlaces = decimalPlaces;
}

import { Component, input } from '@angular/core';

import { UiAmount, UiDelta } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { RatioPipe } from '@shared/format/ratio-pipe';

@Component({
  selector: 'app-holding-detail-figures',
  imports: [RatioPipe, TranslocoPipe, UiAmount, UiDelta],
  templateUrl: './holding-detail-figures.html',
  host: { class: 'block' },
})
export class HoldingDetailFigures {
  readonly holding = input.required<HoldingResponse>();
}

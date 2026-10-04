import { Component, input, output } from '@angular/core';

import { UiAmount } from '@joanroucoux/cairn-ui/amount';
import { UiRow } from '@joanroucoux/cairn-ui/row';
import { TranslocoPipe } from '@jsverse/transloco';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

@Component({
  selector: 'app-holding-add-tracked',
  imports: [TranslocoPipe, UiAmount, UiRow],
  templateUrl: './holding-add-tracked.html',
  host: { class: 'contents' },
})
export class HoldingAddTracked {
  readonly title = input.required<HoldingResponse>();

  readonly picked = output<HoldingResponse>();
}

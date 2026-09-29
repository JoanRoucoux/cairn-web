import { Component, input } from '@angular/core';

import { UiAmount, UiCard, UiDelta } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import type { EnvelopePerformanceResponse } from '@core/api-client/cairnAPI.schemas';

import { RatioPipe } from '@shared/format/ratio-pipe';

@Component({
  selector: 'app-envelope-card',
  imports: [RatioPipe, TranslocoPipe, UiAmount, UiCard, UiDelta],
  templateUrl: './envelope-card.html',
})
export class EnvelopeCard {
  readonly envelopes = input.required<EnvelopePerformanceResponse[]>();
  readonly loading = input(false);
  /** True when `performance` failed to load for the selected range: every delta goes blank. */
  readonly rangeError = input(false);
}

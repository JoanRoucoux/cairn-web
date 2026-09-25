import { Component, input } from '@angular/core';

import { UiCard, UiDelta } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import type { EnvelopePerformanceResponse } from '@core/api-client/cairnAPI.schemas';

import { MoneyPipe } from '@shared/format/money-pipe';
import { RatioPipe } from '@shared/format/ratio-pipe';
import { SignedMoneyPipe } from '@shared/format/signed-money-pipe';

@Component({
  selector: 'app-envelope-card',
  imports: [MoneyPipe, RatioPipe, SignedMoneyPipe, TranslocoPipe, UiCard, UiDelta],
  templateUrl: './envelope-card.html',
})
export class EnvelopeCard {
  readonly envelopes = input.required<EnvelopePerformanceResponse[]>();
  readonly loading = input(false);
  /** True when `performance` failed to load for the selected range: every delta goes blank. */
  readonly rangeError = input(false);
}

import { Component, computed, input, output } from '@angular/core';

import { UiAmount } from '@joanroucoux/cairn-ui/amount';
import { UiRow } from '@joanroucoux/cairn-ui/row';
import { TranslocoPipe } from '@jsverse/transloco';

import type { InstrumentCandidateResponse } from '@core/api-client/cairnAPI.schemas';

@Component({
  selector: 'app-holding-add-candidate',
  imports: [TranslocoPipe, UiAmount, UiRow],
  templateUrl: './holding-add-candidate.html',
  host: { class: 'contents' },
})
export class HoldingAddCandidate {
  readonly candidate = input.required<InstrumentCandidateResponse>();
  readonly sub = input.required<string>();

  readonly picked = output<InstrumentCandidateResponse>();

  protected readonly foreign = computed(() => {
    const currency = this.candidate().currency;

    return currency && currency !== 'EUR' ? currency : undefined;
  });
}

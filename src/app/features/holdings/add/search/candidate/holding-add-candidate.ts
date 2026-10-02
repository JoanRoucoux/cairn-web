import { Component, booleanAttribute, computed, input, output } from '@angular/core';

import { UiAmount, UiRow } from '@joanroucoux/cairn-ui';
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
  readonly busy = input(false, { transform: booleanAttribute });

  readonly picked = output<InstrumentCandidateResponse>();

  protected readonly foreign = computed(() => {
    const currency = this.candidate().currency;

    return currency && currency !== 'EUR' ? currency : undefined;
  });
}

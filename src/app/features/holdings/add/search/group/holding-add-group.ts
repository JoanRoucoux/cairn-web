import { Component, computed, input, output } from '@angular/core';

import { type AsyncState, UiAsync } from '@joanroucoux/cairn-ui/async';
import { UiSkeleton } from '@joanroucoux/cairn-ui/skeleton';
import { TranslocoPipe } from '@jsverse/transloco';

import type { InstrumentCandidateResponse } from '@core/api-client/cairnAPI.schemas';

import type { ResultGroup } from '../../result-groups';
import { HoldingAddCandidate } from '../candidate/holding-add-candidate';

@Component({
  selector: 'app-holding-add-group',
  imports: [HoldingAddCandidate, TranslocoPipe, UiAsync, UiSkeleton],
  templateUrl: './holding-add-group.html',
  host: { class: 'contents' },
})
export class HoldingAddGroup {
  readonly group = input.required<ResultGroup>();

  readonly picked = output<InstrumentCandidateResponse>();
  readonly retried = output<void>();

  protected readonly state = computed<AsyncState>(() => {
    const { candidates, state } = this.group();

    return state === 'ready' && candidates.length === 0 ? 'empty' : (state as AsyncState);
  });
}

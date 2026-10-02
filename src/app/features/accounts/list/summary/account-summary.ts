import { Component, computed, input } from '@angular/core';

import { type AsyncState, UiAmount, UiSkeleton } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import { excludedTotal } from '@shared/format/excluded-lines';
import { pluralKey } from '@shared/format/plural-key';
import { UpperFirstPipe } from '@shared/format/upper-first-pipe';

@Component({
  selector: 'app-account-summary',
  imports: [TranslocoPipe, UiAmount, UiSkeleton, UpperFirstPipe],
  templateUrl: './account-summary.html',
  host: { class: 'flex min-w-0 flex-1 flex-col pl-1 lg:pl-0' },
})
export class AccountSummary {
  readonly state = input.required<AsyncState>();
  readonly count = input.required<number>();
  readonly totalEur = input.required<number | null>();
  readonly excluded = input.required<ReturnType<typeof excludedTotal>>();

  protected readonly pluralKey = pluralKey;
  protected readonly shown = computed(() => this.state() === 'ready' || this.state() === 'empty');
}

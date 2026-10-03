import { Component, input } from '@angular/core';

import { UiAlert } from '@joanroucoux/cairn-ui/alert';
import { type AsyncState, delayedState } from '@joanroucoux/cairn-ui/async';
import { UiSkeleton } from '@joanroucoux/cairn-ui/skeleton';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-holding-detail-missing',
  imports: [TranslocoPipe, UiAlert, UiSkeleton],
  templateUrl: './holding-detail-missing.html',
  host: { class: 'contents' },
})
export class HoldingDetailMissing {
  readonly state = input.required<AsyncState>();

  protected readonly shown = delayedState(this.state);
}

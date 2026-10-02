import { Component, input } from '@angular/core';

import { type AsyncState, UiAlert, UiSkeleton, delayedState } from '@joanroucoux/cairn-ui';
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

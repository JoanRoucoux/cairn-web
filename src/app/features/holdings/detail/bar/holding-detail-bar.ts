import { Component, output } from '@angular/core';

import { UiActionBar } from '@joanroucoux/cairn-ui/action-bar';
import { UiButton } from '@joanroucoux/cairn-ui/button';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-holding-detail-bar',
  imports: [TranslocoPipe, UiActionBar, UiButton],
  templateUrl: './holding-detail-bar.html',
})
export class HoldingDetailBar {
  readonly sell = output<void>();
  readonly buy = output<void>();
}

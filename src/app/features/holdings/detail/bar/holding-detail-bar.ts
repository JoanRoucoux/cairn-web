import { Component, output } from '@angular/core';

import { UiActionBar, UiButton } from '@joanroucoux/cairn-ui';
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

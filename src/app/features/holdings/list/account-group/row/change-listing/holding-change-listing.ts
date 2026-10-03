import { Component, output } from '@angular/core';

import { UiButton, UiRowAction } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-holding-change-listing',
  imports: [TranslocoPipe, UiButton, UiRowAction],
  templateUrl: './holding-change-listing.html',
  host: { class: 'contents' },
})
export class HoldingChangeListing {
  readonly changed = output<void>();
}

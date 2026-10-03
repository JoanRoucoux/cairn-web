import { Component, output } from '@angular/core';

import { UiButton } from '@joanroucoux/cairn-ui/button';
import { UiRowAction } from '@joanroucoux/cairn-ui/table';
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

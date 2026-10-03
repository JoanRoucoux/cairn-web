import { Component, booleanAttribute, input, output } from '@angular/core';

import { UiButton } from '@joanroucoux/cairn-ui/button';
import { UiRowAction } from '@joanroucoux/cairn-ui/table';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-holding-enter-quote',
  imports: [TranslocoPipe, UiButton, UiRowAction],
  templateUrl: './holding-enter-quote.html',
  host: { class: 'contents' },
})
export class HoldingEnterQuote {
  readonly narrow = input(false, { transform: booleanAttribute });

  readonly entered = output<void>();
}

import { Component, booleanAttribute, input, output } from '@angular/core';

import { UiButton } from '@joanroucoux/cairn-ui/button';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-holding-detail-quote-action',
  imports: [TranslocoPipe, UiButton],
  templateUrl: './holding-detail-quote-action.html',
  host: { class: 'contents' },
})
export class HoldingDetailQuoteAction {
  readonly foreign = input(false, { transform: booleanAttribute });
  readonly needsQuote = input(false, { transform: booleanAttribute });

  readonly changeListing = output<void>();
  readonly enterQuote = output<void>();
}

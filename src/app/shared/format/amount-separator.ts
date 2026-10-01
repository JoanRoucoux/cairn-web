import { Component, inject } from '@angular/core';

import { UI_AMOUNT_MASKED } from '@joanroucoux/cairn-ui';

@Component({
  selector: 'app-amount-separator',
  template: `
    @if (!masked()) {
      <span aria-hidden="true"> &middot; </span>
    }
  `,
})
export class AmountSeparator {
  protected readonly masked = inject(UI_AMOUNT_MASKED);
}

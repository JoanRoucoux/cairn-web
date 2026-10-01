import { Component, output } from '@angular/core';

import { UiButton } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-holding-detail-bar',
  imports: [TranslocoPipe, UiButton],
  templateUrl: './holding-detail-bar.html',
  host: {
    class:
      'fixed inset-x-0 bottom-[calc(52px+env(safe-area-inset-bottom))] z-40 grid grid-cols-2 gap-2 bg-(--background) p-3 shadow-[0_-1px_0_var(--hairline)] lg:hidden',
  },
})
export class HoldingDetailBar {
  readonly sell = output<void>();
  readonly buy = output<void>();
}

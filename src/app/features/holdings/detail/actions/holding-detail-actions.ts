import { Component, booleanAttribute, computed, input, output } from '@angular/core';

import { UiButton } from '@joanroucoux/cairn-ui/button';
import { UiMenu, UiMenuTrigger } from '@joanroucoux/cairn-ui/menu';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideEllipsis } from '@lucide/angular';

@Component({
  selector: 'app-holding-detail-actions',
  imports: [LucideEllipsis, TranslocoPipe, UiButton, UiMenuTrigger],
  templateUrl: './holding-detail-actions.html',
  host: { class: 'contents' },
})
export class HoldingDetailActions {
  readonly menu = input.required<UiMenu>();
  readonly foreign = input(false, { transform: booleanAttribute });

  readonly buy = output<void>();
  readonly sell = output<void>();

  protected readonly columns = computed(() =>
    this.foreign() ? 'lg:grid-cols-[auto] lg:justify-end' : 'lg:grid-cols-[1fr_1fr_auto]',
  );
}

import { Component, input } from '@angular/core';

import { UiCard } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideExternalLink } from '@lucide/angular';

@Component({
  selector: 'app-holding-detail-description',
  imports: [LucideExternalLink, TranslocoPipe, UiCard],
  templateUrl: './holding-detail-description.html',
})
export class HoldingDetailDescription {
  readonly description = input.required<string | null | undefined>();
  readonly externalUrl = input<string | null | undefined>(null);
  readonly sourceLabel = input.required<string>();
}

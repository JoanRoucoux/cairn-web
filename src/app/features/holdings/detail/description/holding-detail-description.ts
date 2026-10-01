import { Component, computed, input } from '@angular/core';

import { TranslocoPipe } from '@jsverse/transloco';
import { LucideExternalLink } from '@lucide/angular';

@Component({
  selector: 'app-holding-detail-description',
  imports: [LucideExternalLink, TranslocoPipe],
  templateUrl: './holding-detail-description.html',
  host: { class: 'flex flex-col gap-2 max-lg:px-1 max-lg:pt-1 lg:-mt-2' },
})
export class HoldingDetailDescription {
  readonly description = input.required<string | null | undefined>();
  readonly externalUrl = input<string | null | undefined>(null);

  protected readonly domain = computed(() => {
    const url = this.externalUrl();

    if (!url) {
      return '';
    }

    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  });
}

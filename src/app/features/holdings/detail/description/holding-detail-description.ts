import { Component, computed, input } from '@angular/core';

import { UiExternalLink } from '@joanroucoux/cairn-ui/external-link';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-holding-detail-description',
  imports: [TranslocoPipe, UiExternalLink],
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

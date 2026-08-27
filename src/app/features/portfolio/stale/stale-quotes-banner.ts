import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-stale-quotes-banner',
  imports: [RouterLink, TranslocoPipe],
  template: `
    @if (count() > 0) {
      <div
        class="flex items-center gap-2.5 rounded-xl border border-(--stale)/25 bg-(--stale)/10 px-4 py-3 text-[12.5px] text-(--stale)"
        data-testid="stale-banner"
        role="status"
      >
        <svg
          aria-hidden="true"
          class="shrink-0"
          fill="none"
          height="16"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-width="1.8"
          viewBox="0 0 24 24"
          width="16"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <span>{{ 'portfolio.stale.message' | transloco: { count: count() } }}</span>
        <a class="ml-auto font-semibold underline underline-offset-2" routerLink="/sources">
          {{ 'portfolio.stale.action' | transloco }}
        </a>
      </div>
    }
  `,
})
export class StaleQuotesBanner {
  readonly count = input.required<number>();
}

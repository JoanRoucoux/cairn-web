import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TranslocoPipe } from '@jsverse/transloco';

import type { AccountView } from '../account-list-store';
import { uncountedCaptions, uncountedLink } from '../uncounted-captions';

@Component({
  selector: 'app-account-uncounted',
  imports: [RouterLink, TranslocoPipe],
  template: `@if (captions().length > 0) {
    <a
      class="text-caption flex flex-col rounded-sm text-right font-medium text-(--stale) hover:underline hover:underline-offset-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ring)"
      data-testid="account-uncounted"
      [queryParams]="link().queryParams"
      [routerLink]="link().commands"
    >
      @for (caption of captions(); track caption.key) {
        <span>{{ caption.key | transloco: caption }}</span>
      }
    </a>
  }`,
})
export class AccountUncounted {
  readonly account = input.required<AccountView>();

  protected readonly captions = computed(() => uncountedCaptions(this.account()));
  protected readonly link = computed(() => uncountedLink(this.account()));
}

import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiStaleLink } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import type { AccountView } from '../account-list-store';
import { uncountedCaptions, uncountedLink } from '../uncounted-captions';

@Component({
  selector: 'app-account-uncounted',
  imports: [RouterLink, TranslocoPipe, UiStaleLink],
  template: `@if (captions().length > 0) {
    <a data-testid="account-uncounted" uiStaleLink [queryParams]="link().queryParams" [routerLink]="link().commands">
      <span class="flex flex-col text-right">
        @for (caption of captions(); track caption.key) {
          <span>{{ caption.key | transloco: caption }}</span>
        }
      </span>
    </a>
  }`,
})
export class AccountUncounted {
  readonly account = input.required<AccountView>();

  protected readonly captions = computed(() => uncountedCaptions(this.account()));
  protected readonly link = computed(() => uncountedLink(this.account()));
}

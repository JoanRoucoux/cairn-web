import { Component, computed, input, output } from '@angular/core';

import {
  type AsyncState,
  UiAsync,
  UiBadge,
  UiButton,
  UiCard,
  UiListRow,
  UiRowTile,
  UiSkeleton,
} from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideKeyRound, LucidePlus, LucideTrash } from '@lucide/angular';

import type { PasskeyView } from '../profile-store';

@Component({
  selector: 'app-profile-passkey-list',
  imports: [
    LucideKeyRound,
    LucidePlus,
    LucideTrash,
    TranslocoPipe,
    UiAsync,
    UiBadge,
    UiButton,
    UiCard,
    UiListRow,
    UiRowTile,
    UiSkeleton,
  ],
  templateUrl: './profile-passkey-list.html',
  host: { class: 'block' },
})
export class ProfilePasskeyList {
  readonly state = input.required<AsyncState>();
  readonly passkeys = input.required<PasskeyView[]>();

  readonly add = output<void>();
  readonly remove = output<PasskeyView>();
  readonly retry = output<void>();

  protected readonly onlyKey = computed(() => this.passkeys().length === 1);
}

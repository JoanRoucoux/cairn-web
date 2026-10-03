import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';

import { type AsyncState, UiAsync } from '@joanroucoux/cairn-ui/async';
import { UiBadge } from '@joanroucoux/cairn-ui/badge';
import { UiButton } from '@joanroucoux/cairn-ui/button';
import { UiCard } from '@joanroucoux/cairn-ui/card';
import { UiFlipList, UiHighlight } from '@joanroucoux/cairn-ui/motion';
import { UiListRow, UiRowTile } from '@joanroucoux/cairn-ui/row';
import { UiSkeleton } from '@joanroucoux/cairn-ui/skeleton';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideKeyRound, LucidePlus, LucideTrash } from '@lucide/angular';

import type { PasskeyView } from '../profile-store';

@Component({
  selector: 'app-profile-passkey-list',
  imports: [
    LucideKeyRound,
    LucidePlus,
    LucideTrash,
    NgTemplateOutlet,
    TranslocoPipe,
    UiAsync,
    UiBadge,
    UiButton,
    UiCard,
    UiFlipList,
    UiHighlight,
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
  readonly added = input<ReadonlySet<string>>(new Set());

  readonly add = output<void>();
  readonly remove = output<PasskeyView>();
  readonly retry = output<void>();

  protected readonly onlyKey = computed(() => this.passkeys().length === 1);
}

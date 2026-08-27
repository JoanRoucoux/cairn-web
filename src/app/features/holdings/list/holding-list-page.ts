import { Component, inject } from '@angular/core';

import { TranslocoPipe } from '@jsverse/transloco';
import { UiInput, UiSkeleton } from 'cairn-ui';

import { MoneyPipe } from '@shared/format/money-pipe';

import { HoldingAccountGroup } from './account-group/holding-account-group';
import { HoldingListStore } from './holding-list-store';

@Component({
  selector: 'app-holding-list-page',
  imports: [HoldingAccountGroup, MoneyPipe, TranslocoPipe, UiInput, UiSkeleton],
  templateUrl: './holding-list-page.html',
})
export class HoldingListPage {
  #store = inject(HoldingListStore);

  protected readonly holdings = this.#store.holdings;
  protected readonly groups = this.#store.groups;
  protected readonly totals = this.#store.totals;
  protected readonly search = this.#store.search;

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }
}

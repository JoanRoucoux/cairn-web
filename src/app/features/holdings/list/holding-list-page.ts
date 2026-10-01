import { Component, DestroyRef, ElementRef, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';

import { UiButton, UiField, UiFieldLeading, UiInput, UiSkeleton, UiTable, UiTh } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucidePlus, LucideX } from '@lucide/angular';
import { filter, map, startWith } from 'rxjs';

import { HoldingAddDialog } from '../add/holding-add-dialog';
import { HoldingAccountCard } from './account-group/card/holding-account-card';
import { HoldingAccountGroup } from './account-group/holding-account-group';
import { HoldingCashDialog } from './cash-dialog/holding-cash-dialog';
import { HoldingListStore } from './holding-list-store';

@Component({
  selector: 'app-holding-list-page',
  imports: [
    HoldingAccountCard,
    HoldingAccountGroup,
    HoldingAddDialog,
    HoldingCashDialog,
    LucidePlus,
    LucideX,
    RouterLink,
    RouterOutlet,
    TranslocoPipe,
    UiButton,
    UiField,
    UiFieldLeading,
    UiInput,
    UiSkeleton,
    UiTable,
    UiTh,
  ],
  templateUrl: './holding-list-page.html',
  providers: [HoldingListStore],
})
export class HoldingListPage {
  #store = inject(HoldingListStore);
  #router = inject(Router);
  #route = inject(ActivatedRoute);
  #host = inject<ElementRef<HTMLElement>>(ElementRef);
  #destroyRef = inject(DestroyRef);

  protected readonly holdings = this.#store.holdings;
  protected readonly groups = this.#store.groups;
  protected readonly search = this.#store.search;
  protected readonly staleFilter = this.#store.staleFilter;
  protected readonly accountFilter = this.#store.accountFilter;
  protected readonly assetClassFilter = this.#store.assetClassFilter;

  protected readonly desktop = signal(true);
  protected readonly addOpen = signal(false);
  protected readonly presetAccountId = signal<string | undefined>(undefined);
  protected readonly accountToEditCashFor = signal<string | undefined>(undefined);
  protected readonly groupToEditCashFor = computed(() =>
    this.groups().find((group) => group.accountId === this.accountToEditCashFor()),
  );

  protected readonly selectedHoldingId = toSignal(
    this.#router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.#route.snapshot.firstChild?.paramMap.get('holdingId') ?? undefined),
      startWith(this.#route.snapshot.firstChild?.paramMap.get('holdingId') ?? undefined),
    ),
  );

  protected readonly compact = computed(() => this.selectedHoldingId() !== undefined);

  #wasCompact = false;
  #lastSelected: string | undefined;

  constructor() {
    const query = globalThis.matchMedia?.('(min-width: 1024px)');

    if (query) {
      const update = (): void => this.desktop.set(query.matches);

      update();
      query.addEventListener('change', update);
      this.#destroyRef.onDestroy(() => query.removeEventListener('change', update));
    }

    effect(() => {
      const account = this.#store.addParam();

      if (account) {
        this.presetAccountId.set(account);
        this.addOpen.set(true);
        void this.#router.navigate([], {
          relativeTo: this.#route,
          queryParams: { add: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
    });

    effect(() => {
      const compact = this.compact();
      const selected = this.selectedHoldingId();

      if (this.#wasCompact && !compact) {
        this.#host.nativeElement.querySelector<HTMLElement>(`[data-holding-id="${this.#lastSelected}"]`)?.focus();
      }

      this.#wasCompact = compact;
      this.#lastSelected = selected ?? this.#lastSelected;
    });
  }

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected onAddSaved(): void {
    this.addOpen.set(false);
    this.presetAccountId.set(undefined);
    this.holdings.reload();
  }

  protected onAddDismissed(): void {
    this.addOpen.set(false);
    this.presetAccountId.set(undefined);
  }

  protected onCashSaved(): void {
    this.accountToEditCashFor.set(undefined);
    this.holdings.reload();
  }
}

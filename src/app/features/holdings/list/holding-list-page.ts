import { Component, DestroyRef, ElementRef, afterRenderEffect, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';

import {
  type AsyncState,
  type FilterChipOption,
  UiAsync,
  UiButton,
  UiField,
  UiFieldLeading,
  UiFilterChips,
  UiInput,
  UiSkeleton,
  UiTable,
  UiTh,
} from '@joanroucoux/cairn-ui';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LucidePlus } from '@lucide/angular';
import { filter, map, startWith } from 'rxjs';

import type { AssetClass, HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { HoldingAddDialog } from '../add/holding-add-dialog';
import { ManualQuoteDialog } from '../manual-quote/manual-quote-dialog';
import { HoldingAccountCard } from './account-group/card/holding-account-card';
import { HoldingAccountGroup } from './account-group/holding-account-group';
import { HoldingCashDialog } from './cash-dialog/holding-cash-dialog';
import { HoldingListEmpty } from './empty/holding-list-empty';
import { CLASS_ORDER, HoldingListStore } from './holding-list-store';
import { HoldingListSkeleton } from './skeleton/holding-list-skeleton';
import { HoldingClassSummary } from './summary/holding-class-summary';

const ALL = 'ALL';

@Component({
  selector: 'app-holding-list-page',
  imports: [
    HoldingAccountCard,
    HoldingAccountGroup,
    HoldingAddDialog,
    HoldingClassSummary,
    HoldingCashDialog,
    HoldingListEmpty,
    HoldingListSkeleton,
    LucidePlus,
    ManualQuoteDialog,
    RouterOutlet,
    TranslocoPipe,
    UiAsync,
    UiButton,
    UiField,
    UiFieldLeading,
    UiFilterChips,
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

  readonly #transloco = inject(TranslocoService);
  readonly #allLabel = toSignal(this.#transloco.selectTranslate('classFilter.all', {}, 'holdings'), {
    initialValue: '',
  });
  readonly #classLabels = toSignal(
    this.#transloco.selectTranslate(CLASS_ORDER.map((assetClass) => `enums.assetClass.${assetClass}`)),
    { initialValue: [] as string[] },
  );

  protected readonly holdings = this.#store.holdings;
  protected readonly groups = this.#store.groups;
  protected readonly search = this.#store.search;
  protected readonly assetClass = this.#store.assetClass;
  protected readonly classSummary = this.#store.classSummary;

  protected readonly desktop = signal(true);
  protected readonly state = computed<AsyncState>(() => {
    if (this.holdings.error()) {
      return 'error';
    }

    return this.holdings.isLoading() ? 'loading' : 'ready';
  });

  protected readonly chips = computed<FilterChipOption[]>(() => {
    const counts = this.state() === 'ready' ? this.#store.classCounts() : null;

    return [
      { value: ALL, label: this.#allLabel(), count: counts?.total },
      ...CLASS_ORDER.map((assetClass, index) => ({
        value: assetClass,
        label: this.#classLabels()[index]!,
        count: counts?.byClass[assetClass],
      })),
    ];
  });

  protected readonly chipValue = computed(() => this.assetClass() ?? ALL);

  protected readonly quoteTarget = signal<HoldingResponse | undefined>(undefined);
  protected readonly addOpen = signal(false);
  protected readonly presetAccountId = signal<string | null>(null);
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
  #landedOn: string | undefined;

  constructor() {
    const query = globalThis.matchMedia?.('(min-width: 1024px)');

    if (query) {
      const update = (): void => this.desktop.set(query.matches);

      update();
      query.addEventListener('change', update);
      this.#destroyRef.onDestroy(() => query.removeEventListener('change', update));
    }

    afterRenderEffect(() => {
      const accountId = this.#store.accountParam();

      if (!accountId || this.state() !== 'ready' || accountId === this.#landedOn) {
        return;
      }

      const heading = [...this.#host.nativeElement.querySelectorAll<HTMLElement>('[data-account-id]')]
        .filter((group) => group.dataset['accountId'] === accountId)
        .map((group) => group.querySelector<HTMLElement>('h2'))
        .find((candidate) => candidate?.offsetParent);

      if (heading) {
        this.#landedOn = accountId;
        heading.tabIndex = -1;
        heading.focus();
      }
    });

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
        const rows = [
          ...this.#host.nativeElement.querySelectorAll<HTMLElement>(`[data-holding-id="${this.#lastSelected}"]`),
        ];

        rows.find((row) => row.offsetParent !== null)?.focus();
      }

      this.#wasCompact = compact;
      this.#lastSelected = selected ?? this.#lastSelected;
    });
  }

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected onClassChange(value: string): void {
    this.assetClass.set(value === ALL ? null : (value as AssetClass));
  }

  protected onAddSaved(): void {
    this.addOpen.set(false);
    this.presetAccountId.set(null);
    this.holdings.reload();
  }

  protected onAddDismissed(): void {
    this.addOpen.set(false);
    this.presetAccountId.set(null);
  }

  protected onQuoteSaved(): void {
    this.quoteTarget.set(undefined);
    this.holdings.reload();
  }

  protected onCashSaved(): void {
    this.accountToEditCashFor.set(undefined);
    this.holdings.reload();
  }
}

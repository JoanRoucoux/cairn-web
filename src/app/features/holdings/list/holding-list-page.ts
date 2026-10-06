import { Component, ElementRef, afterRenderEffect, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, NavigationStart, Router, RouterOutlet, Scroll } from '@angular/router';

import { type AsyncState, UiAsync, delayedState } from '@joanroucoux/cairn-ui/async';
import { UiButton } from '@joanroucoux/cairn-ui/button';
import { UiCard } from '@joanroucoux/cairn-ui/card';
import { UiField, UiFieldLeading } from '@joanroucoux/cairn-ui/field';
import { type FilterChipOption, UiFilterChips } from '@joanroucoux/cairn-ui/filter-chips';
import { UiInput } from '@joanroucoux/cairn-ui/input';
import { UiMenu, UiMenuItem } from '@joanroucoux/cairn-ui/menu';
import { UiFlipItem, UiFlipList } from '@joanroucoux/cairn-ui/motion';
import { UiSelectPill } from '@joanroucoux/cairn-ui/select-pill';
import { UiSkeleton } from '@joanroucoux/cairn-ui/skeleton';
import { UiTable, UiTh } from '@joanroucoux/cairn-ui/table';
import { TranslocoPipe, TranslocoService, translateSignal } from '@jsverse/transloco';
import { LucidePlus } from '@lucide/angular';
import { filter, map, startWith } from 'rxjs';

import type { AssetClass, HoldingResponse } from '@core/api-client/cairnAPI.schemas';
import { injectTranslationEvents } from '@core/i18n/translation-events';

import { injectDesktop } from '@shared/layout/desktop-media';

import { HoldingAddDialog } from '../add/holding-add-dialog';
import { HoldingChanges } from '../holding-changes';
import { ManualQuoteDialog } from '../manual-quote/manual-quote-dialog';
import { HoldingAccountCard } from './account-group/card/holding-account-card';
import { HoldingAccountGroup } from './account-group/holding-account-group';
import { HoldingCashDialog } from './cash-dialog/holding-cash-dialog';
import { HoldingListEmpty } from './empty/holding-list-empty';
import { FoldedAccounts } from './folded-accounts';
import { CLASSES_SHOWN_WHEN_HELD, CLASS_ORDER, HoldingListStore, SLUG_BY_CLASS } from './holding-list-store';
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
    UiCard,
    UiField,
    UiFieldLeading,
    UiFilterChips,
    UiInput,
    UiMenu,
    UiMenuItem,
    UiSelectPill,
    UiSkeleton,
    UiFlipItem,
    UiFlipList,
    UiTable,
    UiTh,
  ],
  templateUrl: './holding-list-page.html',
  providers: [HoldingListStore, FoldedAccounts],
})
export class HoldingListPage {
  #store = inject(HoldingListStore);
  #folded = inject(FoldedAccounts);
  #changes = inject(HoldingChanges);
  #router = inject(Router);
  #route = inject(ActivatedRoute);
  #host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly #transloco = inject(TranslocoService);
  readonly #translocoEvents = injectTranslationEvents();

  #allLabel = translateSignal('classFilter.all');

  protected readonly holdings = this.#store.holdings;
  protected readonly groups = this.#store.groups;
  protected readonly search = this.#store.search;
  protected readonly assetClass = this.#store.assetClass;
  protected readonly account = this.#store.account;
  protected readonly accountName = this.#store.accountName;
  protected readonly accountOptions = this.#store.accountOptions;
  protected readonly accountsReady = this.#store.accountsReady;
  protected readonly foldLocked = this.#store.foldLocked;
  protected readonly classSummary = this.#store.classSummary;
  protected readonly flash = this.#store.flash;

  protected readonly desktop = injectDesktop();
  protected readonly state = computed<AsyncState>(() => {
    const status = this.holdings.status();

    if (status === 'loading' || (status === 'reloading' && this.holdings.error())) {
      return 'loading';
    }

    return this.holdings.error() ? 'error' : 'ready';
  });

  protected readonly shown = delayedState(this.state);

  protected readonly chips = computed<FilterChipOption[]>(() => {
    this.#translocoEvents();

    const counts = this.state() === 'ready' ? this.#store.classCounts() : null;

    return [
      { value: ALL, label: this.#allLabel(), count: counts?.total },
      ...CLASS_ORDER.filter(
        (assetClass) =>
          !CLASSES_SHOWN_WHEN_HELD.includes(assetClass) ||
          (counts?.byClass[assetClass] ?? 0) > 0 ||
          this.assetClass() === assetClass,
      ).map((assetClass) => ({
        value: assetClass,
        label: this.#transloco.translate(`enums.assetClass.${assetClass}`),
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

  readonly #selectedAccountId = computed(() => {
    const selected = this.selectedHoldingId();

    return this.holdings.hasValue()
      ? this.holdings.value().find((holding) => holding.id === selected)?.accountId
      : undefined;
  });

  #lastSelected: { holdingId: string; accountId: string | undefined } | undefined;
  readonly #bandToFocus = signal<{ accountId: string | undefined } | null>(null);

  constructor() {
    let leftAt = 0;

    this.#router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationStart) {
        leftAt = window.scrollY;
      } else if (event instanceof Scroll && !event.position && this.#router.url.startsWith('/holdings')) {
        const top = leftAt;

        queueMicrotask(() => window.scrollTo({ top, behavior: 'instant' }));
      }
    });

    effect(() => {
      const account = this.#store.addParam();

      if (account !== null) {
        this.presetAccountId.set(account || null);
        this.addOpen.set(true);
        this.#mergeQueryParams({ add: null });
      }
    });

    effect(() => {
      const known = this.#store.knownAccountIds();

      if (known) {
        untracked(() => this.#folded.prune(known));
      }
    });

    effect(() => {
      if (this.#store.unknownAccountParam()) {
        this.#mergeQueryParams({ compte: null });
      }
    });

    afterRenderEffect(() => {
      const selected = this.selectedHoldingId();
      const accountId = this.#selectedAccountId();

      const last = this.#lastSelected;

      if (selected === undefined && last) {
        untracked(() => this.#focusInList(last));
      }

      this.#lastSelected =
        selected === undefined
          ? undefined
          : { holdingId: selected, accountId: accountId ?? this.#lastSelected?.accountId };
    });

    afterRenderEffect(() => {
      const band = this.#bandToFocus();
      const status = this.holdings.status();

      if (band && status !== 'loading' && status !== 'reloading') {
        untracked(() => {
          this.#bandToFocus.set(null);
          this.#focusBand(band.accountId);
        });
      }
    });
  }

  protected expanded(accountId: string): boolean {
    return this.foldLocked() || !this.#folded.isFolded(accountId);
  }

  protected setExpanded(accountId: string, expanded: boolean): void {
    this.#folded.setFolded(accountId, !expanded);
  }

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected onClassChange(value: string): void {
    this.#mergeQueryParams({ classe: value === ALL ? null : SLUG_BY_CLASS[value as AssetClass] });
  }

  protected chooseAccount(accountId: string | null): void {
    this.#mergeQueryParams({ compte: accountId });
  }

  protected openAdd(): void {
    this.presetAccountId.set(this.#store.securitiesAccount());
    this.addOpen.set(true);
  }

  protected onAddSaved(): void {
    this.onAddDismissed();
  }

  protected onAddDismissed(): void {
    this.addOpen.set(false);
    this.presetAccountId.set(null);
  }

  protected onQuoteSaved(): void {
    this.quoteTarget.set(undefined);
  }

  protected onCashSaved(): void {
    this.accountToEditCashFor.set(undefined);
  }

  #mergeQueryParams(queryParams: Record<string, string | null>): void {
    void this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  #focusInList({ holdingId, accountId }: { holdingId: string; accountId: string | undefined }): void {
    if (this.#changes.lastRemoved()?.id === holdingId) {
      this.#bandToFocus.set({ accountId });
    } else {
      this.#firstVisible(`[data-holding-id="${holdingId}"]`)?.focus();
    }
  }

  #focusBand(accountId: string | undefined): void {
    (
      this.#firstVisible(`[data-account-id="${accountId}"] h2 button`) ??
      this.#firstVisible('[data-account-id] h2 button') ??
      this.#host.nativeElement.querySelector<HTMLElement>('[data-testid="holdings-search"]')
    )?.focus();
  }

  #firstVisible(selector: string): HTMLElement | undefined {
    return [...this.#host.nativeElement.querySelectorAll<HTMLElement>(selector)].find(
      (element) => element.offsetParent !== null,
    );
  }
}

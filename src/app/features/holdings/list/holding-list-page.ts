import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, NavigationStart, Router, RouterOutlet, Scroll } from '@angular/router';

import {
  type AsyncState,
  type FilterChipOption,
  UiAsync,
  UiButton,
  UiCard,
  UiField,
  UiFieldLeading,
  UiFilterChips,
  UiInput,
  UiSkeleton,
  UiTable,
  UiTh,
} from '@joanroucoux/cairn-ui';
import { TranslocoPipe, TranslocoService, translateSignal } from '@jsverse/transloco';
import { LucidePlus } from '@lucide/angular';
import { filter, map, startWith } from 'rxjs';

import type { AssetClass, HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { injectDesktop } from '@shared/layout/desktop-media';

import { HoldingAddDialog } from '../add/holding-add-dialog';
import { ManualQuoteDialog } from '../manual-quote/manual-quote-dialog';
import { HoldingAccountCard } from './account-group/card/holding-account-card';
import { HoldingAccountGroup } from './account-group/holding-account-group';
import { HoldingCashDialog } from './cash-dialog/holding-cash-dialog';
import { HoldingListEmpty } from './empty/holding-list-empty';
import { CLASS_ORDER, HoldingListStore, SLUG_BY_CLASS } from './holding-list-store';
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

  readonly #transloco = inject(TranslocoService);
  readonly #translocoEvents = toSignal(this.#transloco.events$, { initialValue: null });

  #allLabel = translateSignal('classFilter.all');

  protected readonly holdings = this.#store.holdings;
  protected readonly groups = this.#store.groups;
  protected readonly search = this.#store.search;
  protected readonly assetClass = this.#store.assetClass;
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

  protected readonly chips = computed<FilterChipOption[]>(() => {
    this.#translocoEvents();

    const counts = this.state() === 'ready' ? this.#store.classCounts() : null;

    return [
      { value: ALL, label: this.#allLabel(), count: counts?.total },
      ...CLASS_ORDER.map((assetClass) => ({
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

  protected readonly compact = computed(() => this.selectedHoldingId() !== undefined);

  #wasCompact = false;
  #lastSelected: string | undefined;
  #landedOn: string | undefined;

  protected readonly arrival = linkedSignal<string, { accountId: string } | null>({
    source: this.#store.filterKey,
    computation: () => null,
  });
  readonly #routerScrolled = signal(false);

  constructor() {
    let leftAt = 0;

    this.#router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof Scroll) {
        this.#routerScrolled.set(true);
      }

      if (event instanceof NavigationStart) {
        leftAt = window.scrollY;
      } else if (event instanceof Scroll && !event.position && this.#router.url.startsWith('/holdings')) {
        window.scrollTo({ top: leftAt, behavior: 'instant' });
      }
    });

    afterRenderEffect(() => {
      const accountId = this.#store.accountParam();

      if (!accountId || !this.#routerScrolled() || this.state() !== 'ready' || accountId === this.#landedOn) {
        return;
      }

      const heading = [...this.#host.nativeElement.querySelectorAll<HTMLElement>('[data-account-id]')]
        .filter((group) => group.dataset['accountId'] === accountId)
        .map((group) => group.querySelector<HTMLElement>('h2[data-group-heading]'))
        .find((candidate) => candidate?.offsetParent);

      if (heading) {
        this.#landedOn = accountId;
        heading.closest('[data-account-id]')!.scrollIntoView({ block: 'start', behavior: 'auto' });
        heading.focus({ preventScroll: true });
        this.arrival.set({ accountId });
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

  protected highlightFor(accountId: string): object | null {
    const arrival = this.arrival();

    return arrival?.accountId === accountId ? arrival : null;
  }

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected onClassChange(value: string): void {
    void this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: { classe: value === ALL ? null : SLUG_BY_CLASS[value as AssetClass] },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected onAddSaved(): void {
    this.addOpen.set(false);
    this.presetAccountId.set(null);
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
}

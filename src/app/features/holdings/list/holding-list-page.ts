import { Component, ElementRef, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';

import { UiAmount, UiButton, UiField, UiInput, UiSkeleton } from '@joanroucoux/cairn-ui';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LucidePlus, LucideX } from '@lucide/angular';
import { filter, map, startWith } from 'rxjs';

import { LanguageStore } from '@core/i18n/language-store';

import { pluralKey } from '@shared/format/plural-key';

import { HoldingAddDialog } from '../add/holding-add-dialog';
import { HoldingAccountGroup } from './account-group/holding-account-group';
import { HoldingCashDialog } from './cash-dialog/holding-cash-dialog';
import { HoldingListStore } from './holding-list-store';

@Component({
  selector: 'app-holding-list-page',
  imports: [
    HoldingAccountGroup,
    HoldingAddDialog,
    HoldingCashDialog,
    LucidePlus,
    LucideX,
    RouterLink,
    RouterOutlet,
    TranslocoPipe,
    UiAmount,
    UiButton,
    UiField,
    UiInput,
    UiSkeleton,
  ],
  templateUrl: './holding-list-page.html',
  providers: [HoldingListStore],
})
export class HoldingListPage {
  #store = inject(HoldingListStore);
  #router = inject(Router);
  #route = inject(ActivatedRoute);
  #host = inject<ElementRef<HTMLElement>>(ElementRef);
  #transloco = inject(TranslocoService);
  #language = inject(LanguageStore);

  protected readonly holdings = this.#store.holdings;
  protected readonly groups = this.#store.groups;
  protected readonly totals = this.#store.totals;

  protected readonly summaryText = computed(() => {
    this.#language.activeLang();
    const totals = this.totals();
    const lines = this.#transloco.translate(pluralKey('holdings.summaryLines', totals.lines), { count: totals.lines });
    const accounts = this.#transloco.translate(pluralKey('holdings.summaryAccounts', totals.accounts), {
      count: totals.accounts,
    });

    return this.#transloco.translate('holdings.summary', { lines, accounts });
  });

  protected readonly unvaluedCountText = computed(() => {
    this.#language.activeLang();
    const count = this.totals().unvaluedCount;

    return this.#transloco.translate(pluralKey('holdings.unvaluedCount', count), { count });
  });
  protected readonly search = this.#store.search;
  protected readonly staleFilter = this.#store.staleFilter;
  protected readonly accountFilter = this.#store.accountFilter;
  protected readonly assetClassFilter = this.#store.assetClassFilter;

  protected readonly addOpen = signal(false);
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

  constructor() {
    effect(() => {
      const compact = this.compact();

      if (this.#wasCompact && !compact) {
        this.#host.nativeElement.querySelector<HTMLElement>('[data-testid="holdings-summary"]')?.focus();
      }

      this.#wasCompact = compact;
    });
  }

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected onAddSaved(): void {
    this.addOpen.set(false);
    this.holdings.reload();
  }

  protected onAddDismissed(): void {
    this.addOpen.set(false);
  }

  protected onCashSaved(): void {
    this.accountToEditCashFor.set(undefined);
    this.holdings.reload();
  }
}

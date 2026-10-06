import { NgTemplateOutlet } from '@angular/common';
import { Component, LOCALE_ID, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

import { UI_AMOUNT_MASKED, UiAmount, formatAmount } from '@joanroucoux/cairn-ui/amount';
import { type AsyncState, UiAsync } from '@joanroucoux/cairn-ui/async';
import { UiCard } from '@joanroucoux/cairn-ui/card';
import { type DonutSlice, UiDonut } from '@joanroucoux/cairn-ui/donut';
import { UiSkeleton } from '@joanroucoux/cairn-ui/skeleton';
import { TranslocoPipe, TranslocoService, translateSignal } from '@jsverse/transloco';

import type { AccountAllocationResponse, AssetClassAllocationResponse } from '@core/api-client/cairnAPI.schemas';
import { injectTranslationEvents } from '@core/i18n/translation-events';

import { excludedTotal } from '@shared/format/excluded-lines';
import { pluralKey } from '@shared/format/plural-key';
import { RatioPipe } from '@shared/format/ratio-pipe';
import { UpperFirstPipe } from '@shared/format/upper-first-pipe';

import { AllocationStore } from './allocation-store';

const CLASS_SLUGS: Record<string, string> = {
  ETF: 'etf',
  FUND: 'fonds',
  EQUITY: 'actions',
  CRYPTO: 'crypto',
  BOND: 'obligations',
  OTHER: 'autre',
  CASH: 'liquidites',
};

const GRID_BASE =
  'grid grid-cols-[minmax(0,1fr)] gap-4 @min-[960px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @min-[960px]:gap-6';
const GRID_CONTENT =
  '@min-[1113px]:mr-[calc(-1*var(--gutter))] @min-[1113px]:grid-cols-[minmax(0,max-content)_minmax(0,max-content)]';

const OTHERS_ID = 'others';

const GRID_CLASSES_READY = '@min-[1113px]:grid-cols-[minmax(max-content,1fr)_minmax(0,1fr)]';
const GRID_ACCOUNTS_READY = '@min-[1113px]:grid-cols-[minmax(0,1fr)_minmax(max-content,1fr)]';
const GRID_NONE_READY = '@min-[1113px]:grid-cols-[1fr_1fr]';

const asyncStateFor = (loading: boolean, failed: boolean, empty: boolean): AsyncState => {
  if (failed) {
    return 'error';
  }
  if (loading) {
    return 'loading';
  }
  return empty ? 'empty' : 'ready';
};

@Component({
  selector: 'app-allocation-page',
  imports: [NgTemplateOutlet, TranslocoPipe, UiAmount, UiAsync, UiCard, UiDonut, UiSkeleton, UpperFirstPipe],
  templateUrl: './allocation-page.html',
  providers: [AllocationStore, RatioPipe],
})
export class AllocationPage {
  #store = inject(AllocationStore);
  #router = inject(Router);
  #transloco = inject(TranslocoService);
  #locale = inject(LOCALE_ID);
  #masked = inject(UI_AMOUNT_MASKED);
  #ratio = inject(RatioPipe);

  readonly #translocoEvents = injectTranslationEvents();
  readonly #scopeLoaded = translateSignal('allocation.cashSubtitle');

  protected readonly summary = computed<AssetClassAllocationResponse | AccountAllocationResponse | undefined>(() => {
    if (this.#store.classes.hasValue()) {
      return this.#store.classes.value();
    }

    return this.#store.accounts.hasValue() ? this.#store.accounts.value() : undefined;
  });

  protected readonly excludedTotal = excludedTotal;

  protected readonly assetClassState = computed<AsyncState>(() =>
    asyncStateFor(
      this.#store.classes.isLoading(),
      !!this.#store.classes.error(),
      this.#store.classes.hasValue() && this.#store.classes.value().items.length === 0,
    ),
  );

  protected readonly accountState = computed<AsyncState>(() =>
    asyncStateFor(
      this.#store.accounts.isLoading(),
      !!this.#store.accounts.error(),
      this.#store.accounts.hasValue() && this.#store.accounts.value().items.length === 0,
    ),
  );

  protected readonly assetClassSlices = computed<DonutSlice[]>(() => {
    this.#translocoEvents();

    if (!this.#scopeLoaded() || !this.#store.classes.hasValue()) {
      return [];
    }

    return assetClassSlicesOf(this.#store.classes.value(), (key, params) => this.#transloco.translate(key, params));
  });

  protected readonly accountSlices = computed<DonutSlice[]>(() => {
    this.#translocoEvents();

    if (!this.#store.accounts.hasValue()) {
      return [];
    }

    return accountSlicesOf(this.#store.accounts.value(), (key) => this.#transloco.translate(key));
  });

  protected readonly formatEur = (value: number): string =>
    formatAmount(value, { locale: this.#locale, currency: 'EUR' }, this.#masked());

  protected readonly formatShare = (share: number): string => this.#ratio.transform(share);

  protected readonly classSkeleton = [70, 60, 80, 96, 64];
  protected readonly accountSkeleton = [110, 70, 90, 80, 76, 100, 110];

  protected readonly wrapperClass = (state: AsyncState): string =>
    state === 'ready' ? 'block px-2 pt-2 lg:pb-1' : 'block p-2';

  protected readonly gridClass = computed(() => {
    const classes = this.assetClassState() === 'ready';
    const accounts = this.accountState() === 'ready';

    if (classes && accounts) {
      return `${GRID_BASE} ${GRID_CONTENT}`;
    }

    if (classes) {
      return `${GRID_BASE} ${GRID_CLASSES_READY}`;
    }

    return `${GRID_BASE} ${accounts ? GRID_ACCOUNTS_READY : GRID_NONE_READY}`;
  });

  protected readonly classHref = (id: string): string | null =>
    id === OTHERS_ID ? null : `/holdings?classe=${CLASS_SLUGS[id]}`;

  protected readonly accountHref = (id: string): string | null =>
    id === OTHERS_ID ? null : `/holdings?compte=${encodeURIComponent(id)}`;

  protected retryClasses(): void {
    this.#store.retryClasses();
  }

  protected retryAccounts(): void {
    this.#store.retryAccounts();
  }

  protected onAssetClassSelect(id: string): void {
    if (id === OTHERS_ID) {
      return;
    }

    this.#router.navigate(['/holdings'], { queryParams: { classe: CLASS_SLUGS[id] } });
  }

  protected onAccountSelect(id: string): void {
    if (id === OTHERS_ID) {
      return;
    }

    this.#router.navigate(['/holdings'], { queryParams: { compte: id } });
  }
}

function assetClassSlicesOf(
  allocation: AssetClassAllocationResponse,
  translate: (key: string, params?: Record<string, unknown>) => string,
): DonutSlice[] {
  return allocation.items.map((row) => ({
    id: row.assetClass,
    label: translate(`enums.assetClass.${row.assetClass}`),
    value: row.valueEur,
    sublabel:
      row.assetClass === 'CASH'
        ? translate('portfolio.allocation.cashSubtitle')
        : translate(pluralKey('portfolio.allocation.lineCount', row.lineCount), { count: row.lineCount }),
  }));
}

function accountSlicesOf(allocation: AccountAllocationResponse, translate: (key: string) => string): DonutSlice[] {
  return allocation.items.map(({ account, valueEur }) => {
    const type = translate(`enums.accountType.${account.type}`);
    const institution = account.institution.trim();

    return {
      id: account.id,
      label: account.name,
      value: valueEur,
      sublabel: institution ? `${type} · ${institution}` : type,
    };
  });
}

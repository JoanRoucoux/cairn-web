import { NgTemplateOutlet } from '@angular/common';
import { Component, LOCALE_ID, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import {
  type AsyncState,
  type DonutSlice,
  UI_AMOUNT_MASKED,
  UiAmount,
  UiAsync,
  UiDonut,
  UiSkeleton,
  formatAmount,
} from '@joanroucoux/cairn-ui';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import type { AccountAllocationResponse, AssetClassAllocationResponse } from '@core/api-client/cairnAPI.schemas';

import { pluralKey } from '@shared/format/plural-key';
import { RatioPipe } from '@shared/format/ratio-pipe';

import { AllocationStore } from './allocation-store';

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
  imports: [NgTemplateOutlet, TranslocoPipe, UiAmount, UiAsync, UiDonut, UiSkeleton],
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

  readonly #translocoEvents = toSignal(this.#transloco.events$, { initialValue: null });

  protected readonly totalEur = computed<number | undefined>(() => {
    if (this.#store.classes.hasValue()) {
      return this.#store.classes.value().totalEur;
    }

    return this.#store.accounts.hasValue() ? this.#store.accounts.value().totalEur : undefined;
  });

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

    if (!this.#store.classes.hasValue()) {
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

  protected readonly wrapperClass = (state: AsyncState): string => {
    if (state === 'ready') {
      return 'block px-2 pt-2 lg:pb-1';
    }

    return state === 'error'
      ? 'block p-2 lg:[&>[role=alert]]:items-center lg:[&>[role=alert]]:py-10 lg:[&>[role=alert]]:text-center'
      : 'block p-2';
  };

  protected retryClasses(): void {
    this.#store.retryClasses();
  }

  protected retryAccounts(): void {
    this.#store.retryAccounts();
  }

  protected onAssetClassSelect(id: string): void {
    this.#router.navigate(['/holdings'], { queryParams: { assetClass: id } });
  }

  protected onAccountSelect(id: string): void {
    this.#router.navigate(['/holdings'], { queryParams: { account: id } });
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
      id: account.name,
      label: account.name,
      value: valueEur,
      sublabel: institution ? `${type} · ${institution}` : type,
    };
  });
}

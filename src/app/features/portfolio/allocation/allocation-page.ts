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

import type { AccountResponse, PortfolioResponse } from '@core/api-client/cairnAPI.schemas';

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

  protected readonly portfolio = this.#store.portfolio;

  protected readonly totalEur = computed(() => this.portfolio.value()!.totalEur);

  protected readonly assetClassState = computed<AsyncState>(() =>
    asyncStateFor(
      this.portfolio.isLoading(),
      !!this.portfolio.error(),
      this.portfolio.hasValue() && this.portfolio.value().byAssetClass.length === 0,
    ),
  );

  protected readonly accountState = computed<AsyncState>(() =>
    asyncStateFor(
      this.portfolio.isLoading(),
      !!this.portfolio.error(),
      this.portfolio.hasValue() && this.portfolio.value().byAccount.length === 0,
    ),
  );

  protected readonly assetClassSlices = computed<DonutSlice[]>(() => {
    this.#translocoEvents();

    if (!this.portfolio.hasValue()) {
      return [];
    }

    return assetClassSlicesOf(this.portfolio.value(), (key, params) => this.#transloco.translate(key, params));
  });

  protected readonly accountSlices = computed<DonutSlice[]>(() => {
    this.#translocoEvents();

    if (!this.portfolio.hasValue()) {
      return [];
    }

    return accountSlicesOf(this.portfolio.value(), this.#store.accounts.value(), (key) =>
      this.#transloco.translate(key),
    );
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

  protected retry(): void {
    this.#store.retry();
  }

  protected onAssetClassSelect(id: string): void {
    this.#router.navigate(['/holdings'], { queryParams: { assetClass: id } });
  }

  protected onAccountSelect(id: string): void {
    this.#router.navigate(['/holdings'], { queryParams: { account: id } });
  }
}

function assetClassSlicesOf(
  portfolio: PortfolioResponse,
  translate: (key: string, params?: Record<string, unknown>) => string,
): DonutSlice[] {
  return portfolio.byAssetClass.map((row) => ({
    id: row.label,
    label: translate(`enums.assetClass.${row.label}`),
    value: row.valueEur,
    sublabel:
      row.label === 'CASH'
        ? translate('portfolio.allocation.cashSubtitle')
        : translate('portfolio.allocation.lineCount', {
            count: portfolio.holdings.filter((holding) => holding.assetClass === row.label).length,
          }),
  }));
}

function accountSlicesOf(
  portfolio: PortfolioResponse,
  accounts: AccountResponse[],
  translate: (key: string) => string,
): DonutSlice[] {
  const byName = new Map(accounts.map((account) => [account.name, account]));

  return portfolio.byAccount.map((row) => {
    const account = byName.get(row.label);
    const sublabel = account ? `${translate(`enums.accountType.${account.type}`)} · ${account.institution}` : '';

    return { id: row.label, label: row.label, value: row.valueEur, sublabel };
  });
}

import { NgTemplateOutlet } from '@angular/common';
import { Component, LOCALE_ID, computed, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import {
  type AsyncState,
  type ChartPoint,
  type SegmentedOption,
  UI_AMOUNT_MASKED,
  UiAlert,
  UiAmount,
  UiAsync,
  UiBackLink,
  UiButton,
  UiCard,
  UiDelta,
  UiLineChart,
  UiMenu,
  UiMenuItem,
  UiMenuTrigger,
  UiSegmented,
  UiSkeleton,
} from '@joanroucoux/cairn-ui';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LucideEllipsis, LucidePencil, LucideTrash, LucideX } from '@lucide/angular';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';
import { LanguageStore } from '@core/i18n/language-store';

import { chartFormats } from '@shared/chart/chart-formats';
import { CHART_RANGES, type ChartRange } from '@shared/chart/chart-range';
import { FocusOnInit } from '@shared/focus/focus-on-init';
import { AmountSeparator } from '@shared/format/amount-separator';
import { RatioPipe } from '@shared/format/ratio-pipe';

import { HoldingChanges } from '../holding-changes';
import { HoldingDetailBar } from './bar/holding-detail-bar';
import { HoldingDetailDescription } from './description/holding-detail-description';
import { HoldingDetailDialogs } from './dialogs/holding-detail-dialogs';
import { HoldingDetailFacts } from './facts/holding-detail-facts';
import { HoldingDetailFigures } from './figures/holding-detail-figures';
import { HoldingDetailStore } from './holding-detail-store';
import type { SellResult } from './sell-dialog/holding-sell-dialog-store';

@Component({
  selector: 'app-holding-detail-page',
  imports: [
    AmountSeparator,
    FocusOnInit,
    HoldingDetailBar,
    HoldingDetailDescription,
    HoldingDetailDialogs,
    HoldingDetailFacts,
    HoldingDetailFigures,
    LucideEllipsis,
    LucidePencil,
    LucideTrash,
    LucideX,
    NgTemplateOutlet,
    RatioPipe,
    RouterLink,
    TranslocoPipe,
    UiAlert,
    UiAmount,
    UiAsync,
    UiBackLink,
    UiButton,
    UiCard,
    UiDelta,
    UiLineChart,
    UiMenu,
    UiMenuItem,
    UiMenuTrigger,
    UiSegmented,
    UiSkeleton,
  ],
  templateUrl: './holding-detail-page.html',
  providers: [HoldingDetailStore],
})
export class HoldingDetailPage {
  #store = inject(HoldingDetailStore);
  #router = inject(Router);
  #changes = inject(HoldingChanges);
  #transloco = inject(TranslocoService);
  #language = inject(LanguageStore);
  #locale = inject(LOCALE_ID);
  #masked = inject(UI_AMOUNT_MASKED);

  protected readonly menu = viewChild.required<UiMenu>('menu');

  protected readonly holding = this.#store.holding;
  protected readonly holdings = this.#store.holdings;
  protected readonly instrument = this.#store.instrument;
  protected readonly points = this.#store.points;
  protected readonly range = this.#store.range;
  protected readonly rangeChange = computed(() => (this.#store.quotesFailed() ? undefined : this.#store.rangeChange()));
  protected readonly chartState = computed<AsyncState>(() =>
    this.#store.quotesRetrying() ? 'loading' : this.#store.quotesFailed() ? 'error' : 'ready',
  );
  protected readonly shownRange = this.#store.shownRange;
  protected readonly quotesFailed = this.#store.quotesFailed;
  protected readonly instrumentDetail = computed(() =>
    this.instrument.hasValue() ? this.instrument.value() : undefined,
  );

  protected readonly priced = computed(() => (this.holding()?.price ?? null) !== null);

  protected readonly isCash = computed(() => this.holding()?.assetClass === 'CASH');

  protected readonly rangeOptions = computed<SegmentedOption[]>(() => {
    this.#language.activeLang();
    return CHART_RANGES.map((value) => ({ value, label: this.#transloco.translate(`chart.range.${value}`) }));
  });

  protected readonly startLabel = computed(() => {
    this.#language.activeLang();
    return this.#transloco.translate('chart.startLabel');
  });

  protected readonly chart = computed(() => chartFormats(this.#locale, this.#masked(), this.shownRange()));

  protected readonly tooltipFormat = computed(() => {
    this.#language.activeLang();

    const quantity = this.holding()!.quantity;
    const { value } = this.chart();

    return (point: ChartPoint): string =>
      this.#transloco.translate('holdings.detail.tooltip', {
        value: value(point.v),
        price: value(point.v / quantity),
      });
  });

  protected readonly pricingInstrument = signal<{ id: string; name: string } | undefined>(undefined);
  protected readonly buyOpen = signal(false);
  protected readonly sellOpen = signal(false);
  protected readonly editOpen = signal(false);
  protected readonly deleteOpen = signal(false);

  protected readonly priceSourceLabel = computed(() => {
    this.#language.activeLang();
    return this.#transloco.translate(`enums.priceSource.${this.holding()?.priceSource}`);
  });

  protected setRange(value: string): void {
    this.range.set(value as ChartRange);
  }

  protected retryQuotes(): void {
    this.#store.retryQuotes();
  }

  protected onEnterQuote(): void {
    const holding = this.holding();

    if (holding) {
      this.pricingInstrument.set({ id: holding.instrumentId, name: holding.instrumentName });
    }
  }

  protected onQuoteSaved(holdingId: string): void {
    this.pricingInstrument.set(undefined);
    this.#changes.touched(holdingId);
    this.#store.reload();
  }

  protected onQuoteDismissed(): void {
    this.pricingInstrument.set(undefined);
  }

  protected onBought(holding: HoldingResponse): void {
    this.buyOpen.set(false);
    this.#changes.touched(holding.id);
    this.#store.reload();
  }

  protected onSold(result: SellResult, holdingId: string): void {
    this.sellOpen.set(false);

    if (result.outcome === 'closed') {
      this.#changes.removed(holdingId);
      this.backToList();
    } else {
      this.#changes.touched(holdingId);
      this.#store.reload();
    }
  }

  protected onEdited(holding: HoldingResponse): void {
    this.editOpen.set(false);
    this.#changes.touched(holding.id);
    this.#store.reload();
  }

  protected onDeleted(holdingId: string): void {
    this.deleteOpen.set(false);
    this.#changes.removed(holdingId);
    this.backToList();
  }

  protected openEdit(): void {
    this.menu().close();
    this.editOpen.set(true);
  }

  protected openDelete(): void {
    this.menu().close();
    this.deleteOpen.set(true);
  }

  private backToList(): void {
    void this.#router.navigate(['/holdings'], { queryParamsHandling: 'preserve' });
  }
}

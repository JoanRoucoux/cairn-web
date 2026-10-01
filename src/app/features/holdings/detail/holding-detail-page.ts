import { Component, LOCALE_ID, computed, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import {
  type SegmentedOption,
  UI_AMOUNT_MASKED,
  UiAmount,
  UiButton,
  UiDelta,
  UiLineChart,
  UiMenu,
  UiMenuItem,
  UiMenuTrigger,
  UiSegmented,
  UiSkeleton,
} from '@joanroucoux/cairn-ui';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LucideChevronLeft, LucideEllipsis, LucideX } from '@lucide/angular';

import { LanguageStore } from '@core/i18n/language-store';

import { chartFormats } from '@shared/chart/chart-formats';
import { CHART_RANGES, type ChartRange } from '@shared/chart/chart-range';
import { RatioPipe } from '@shared/format/ratio-pipe';

import { HoldingDetailBar } from './bar/holding-detail-bar';
import { HoldingDetailDescription } from './description/holding-detail-description';
import { HoldingDetailDialogs } from './dialogs/holding-detail-dialogs';
import { HoldingDetailFacts } from './facts/holding-detail-facts';
import { HoldingDetailFigures } from './figures/holding-detail-figures';
import { HoldingDetailStore } from './holding-detail-store';

@Component({
  selector: 'app-holding-detail-page',
  imports: [
    HoldingDetailBar,
    HoldingDetailDescription,
    HoldingDetailDialogs,
    HoldingDetailFacts,
    HoldingDetailFigures,
    LucideChevronLeft,
    LucideEllipsis,
    LucideX,
    RatioPipe,
    RouterLink,
    TranslocoPipe,
    UiAmount,
    UiButton,
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
  protected readonly rangeChange = this.#store.rangeChange;
  protected readonly instrumentDetail = computed(() =>
    this.instrument.hasValue() ? this.instrument.value() : undefined,
  );

  protected readonly isCash = computed(() => this.holding()?.assetClass === 'CASH');

  protected readonly rangeOptions = computed<SegmentedOption[]>(() => {
    this.#language.activeLang();
    return CHART_RANGES.map((value) => ({ value, label: this.#transloco.translate(`chart.range.${value}`) }));
  });

  protected readonly startLabel = computed(() => {
    this.#language.activeLang();
    return this.#transloco.translate('chart.startLabel');
  });

  protected readonly chart = computed(() => chartFormats(this.#locale, this.#masked(), this.range()));

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

  protected onEnterQuote(): void {
    const holding = this.holding();

    if (holding) {
      this.pricingInstrument.set({ id: holding.instrumentId, name: holding.instrumentName });
    }
  }

  protected onQuoteSaved(): void {
    this.pricingInstrument.set(undefined);
    this.#store.reload();
  }

  protected onQuoteDismissed(): void {
    this.pricingInstrument.set(undefined);
  }

  protected onBought(): void {
    this.buyOpen.set(false);
    this.#store.reload();
  }

  protected onSold(closed: boolean): void {
    this.sellOpen.set(false);

    if (closed) {
      this.backToList();
    } else {
      this.#store.reload();
    }
  }

  protected onEdited(): void {
    this.editOpen.set(false);
    this.#store.reload();
  }

  protected onDeleted(): void {
    this.deleteOpen.set(false);
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

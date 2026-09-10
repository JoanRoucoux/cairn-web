import { Component, computed, inject, signal } from '@angular/core';

import { type SegmentedOption, UiCard, UiDelta, UiSegmented, UiSkeleton } from '@joanroucoux/cairn-ui';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { LanguageStore } from '@core/i18n/language-store';

import { CHART_RANGES, type ChartRange } from '@shared/chart/chart-range';
import { LineChart } from '@shared/chart/line-chart';
import { MoneyPipe } from '@shared/format/money-pipe';
import { RelativeDatePipe } from '@shared/format/relative-date-pipe';
import { SignedMoneyPipe } from '@shared/format/signed-money-pipe';

import { HoldingDetailStore } from './holding-detail-store';
import { ManualQuoteDialog } from './manual-quote/manual-quote-dialog';

@Component({
  selector: 'app-holding-detail-page',
  imports: [
    LineChart,
    ManualQuoteDialog,
    MoneyPipe,
    RelativeDatePipe,
    SignedMoneyPipe,
    TranslocoPipe,
    UiCard,
    UiDelta,
    UiSegmented,
    UiSkeleton,
  ],
  templateUrl: './holding-detail-page.html',
  providers: [HoldingDetailStore],
})
export class HoldingDetailPage {
  #store = inject(HoldingDetailStore);
  #transloco = inject(TranslocoService);
  #language = inject(LanguageStore);

  protected readonly holding = this.#store.holding;
  protected readonly holdings = this.#store.holdings;
  protected readonly instrument = this.#store.instrument;
  protected readonly points = this.#store.points;
  protected readonly range = this.#store.range;

  // chart.* lives in the preloaded global i18n file (no lazy scope to race), so reacting
  // to language changes through LanguageStore is enough.
  protected readonly rangeOptions = computed<SegmentedOption[]>(() => {
    this.#language.activeLang();
    return CHART_RANGES.map((value) => ({ value, label: this.#transloco.translate(`chart.range.${value}`) }));
  });

  protected readonly pricingInstrument = signal<{ id: string; name: string } | undefined>(undefined);

  // enums.* lives in the preloaded global i18n file (no lazy scope to race), so reacting
  // to language changes through LanguageStore is enough.
  protected readonly priceSourceLabel = computed(() => {
    this.#language.activeLang();
    return this.#transloco.translate(`enums.priceSource.${this.holding()?.priceSource}`);
  });

  // The library types the option value as `string`; every option here is built from CHART_RANGES.
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
}

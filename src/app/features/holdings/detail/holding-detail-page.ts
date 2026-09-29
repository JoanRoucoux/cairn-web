import { Component, LOCALE_ID, computed, inject, signal } from '@angular/core';

import {
  type SegmentedOption,
  UI_AMOUNT_MASKED,
  UiAmount,
  UiBadge,
  UiCard,
  UiDelta,
  UiLineChart,
  UiSegmented,
  UiSkeleton,
} from '@joanroucoux/cairn-ui';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { LanguageStore } from '@core/i18n/language-store';

import { chartFormats } from '@shared/chart/chart-formats';
import { CHART_RANGES, type ChartRange } from '@shared/chart/chart-range';
import { decimalPlaces } from '@shared/format/decimal-places';
import { RelativeDatePipe } from '@shared/format/relative-date-pipe';

import { HoldingDetailStore } from './holding-detail-store';
import { ManualQuoteDialog } from './manual-quote/manual-quote-dialog';

@Component({
  selector: 'app-holding-detail-page',
  imports: [
    ManualQuoteDialog,
    RelativeDatePipe,
    TranslocoPipe,
    UiAmount,
    UiBadge,
    UiCard,
    UiDelta,
    UiLineChart,
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
  #locale = inject(LOCALE_ID);
  #masked = inject(UI_AMOUNT_MASKED);

  protected readonly decimalPlaces = decimalPlaces;

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

  protected readonly startLabel = computed(() => {
    this.#language.activeLang();
    return this.#transloco.translate('chart.startLabel');
  });

  protected readonly chart = computed(() => chartFormats(this.#locale, this.#masked(), this.range()));

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

import { Component, computed, inject } from '@angular/core';

import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { type SegmentedOption, UiCard, UiDelta, UiSegmented, UiSkeleton } from 'cairn-ui';

import { LanguageStore } from '@core/i18n/language-store';

import { CHART_RANGES, type ChartRange } from '@shared/chart/chart-range';
import { LineChart } from '@shared/chart/line-chart';
import { MoneyPipe } from '@shared/format/money-pipe';
import { RatioPipe } from '@shared/format/ratio-pipe';
import { SignedMoneyPipe } from '@shared/format/signed-money-pipe';

import { PortfolioMovers } from './movers/portfolio-movers';
import { PortfolioStore } from './portfolio-store';
import { StaleQuotesBanner } from './stale/stale-quotes-banner';

@Component({
  selector: 'app-portfolio-page',
  imports: [
    LineChart,
    MoneyPipe,
    PortfolioMovers,
    RatioPipe,
    SignedMoneyPipe,
    StaleQuotesBanner,
    TranslocoPipe,
    UiCard,
    UiDelta,
    UiSegmented,
    UiSkeleton,
  ],
  templateUrl: './portfolio-page.html',
})
export class PortfolioPage {
  #store = inject(PortfolioStore);
  #transloco = inject(TranslocoService);
  #language = inject(LanguageStore);

  protected readonly portfolio = this.#store.portfolio;
  protected readonly range = this.#store.range;
  protected readonly points = this.#store.points;
  protected readonly reconstructed = this.#store.reconstructed;

  // chart.* lives in the preloaded global i18n file (no lazy scope to race), so reacting
  // to language changes through LanguageStore is enough.
  protected readonly rangeOptions = computed<SegmentedOption[]>(() => {
    this.#language.activeLang();
    return CHART_RANGES.map((value) => ({ value, label: this.#transloco.translate(`chart.range.${value}`) }));
  });

  // The library types the option value as `string`; every option here is built from CHART_RANGES.
  protected setRange(value: string): void {
    this.range.set(value as ChartRange);
  }
}

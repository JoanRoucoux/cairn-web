import { Component, computed, inject } from '@angular/core';

import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { type SegmentedOption, UiCard, UiDelta, UiSegmented, UiSkeleton } from 'cairn-ui';

import { LineChart } from '@shared/chart/line-chart';
import { MoneyPipe } from '@shared/format/money-pipe';
import { RatioPipe } from '@shared/format/ratio-pipe';
import { SignedMoneyPipe } from '@shared/format/signed-money-pipe';

import { PortfolioMovers } from './movers/portfolio-movers';
import { PORTFOLIO_RANGES, type PortfolioRange, PortfolioStore } from './portfolio-store';
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

  protected readonly portfolio = this.#store.portfolio;
  protected readonly range = this.#store.range;
  protected readonly points = this.#store.points;
  protected readonly reconstructed = this.#store.reconstructed;

  protected readonly rangeOptions = computed<SegmentedOption[]>(() =>
    PORTFOLIO_RANGES.map((value) => ({ value, label: this.#transloco.translate(`portfolio.range.${value}`) })),
  );

  // The library types the option value as `string`; every option here is built from PORTFOLIO_RANGES.
  protected setRange(value: string): void {
    this.range.set(value as PortfolioRange);
  }
}

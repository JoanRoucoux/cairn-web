import { Component, LOCALE_ID, computed, inject } from '@angular/core';

import { UI_AMOUNT_MASKED } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import { chartFormats } from '@shared/chart/chart-formats';
import type { ChartRange } from '@shared/chart/chart-range';

import { PortfolioCurve } from './curve/portfolio-curve';
import { PortfolioEmpty } from './empty/portfolio-empty';
import { PortfolioEnvelopes } from './envelopes/portfolio-envelopes';
import { PortfolioMovers } from './movers/portfolio-movers';
import { PortfolioStore } from './portfolio-store';
import { PortfolioTotal } from './total/portfolio-total';

@Component({
  selector: 'app-portfolio-page',
  imports: [PortfolioCurve, PortfolioEmpty, PortfolioEnvelopes, PortfolioMovers, PortfolioTotal, TranslocoPipe],
  templateUrl: './portfolio-page.html',
  providers: [PortfolioStore],
})
export class PortfolioPage {
  #store = inject(PortfolioStore);
  #locale = inject(LOCALE_ID);
  #masked = inject(UI_AMOUNT_MASKED);

  protected readonly totalState = this.#store.totalState;
  protected readonly curveState = this.#store.curveState;
  protected readonly envelopesState = this.#store.envelopesState;
  protected readonly moversState = this.#store.moversState;
  protected readonly curveBlocking = this.#store.curveBlocking;
  protected readonly allFailed = this.#store.allFailed;

  protected readonly portfolio = this.#store.portfolioValue;
  protected readonly performance = this.#store.performanceValue;
  protected readonly points = this.#store.points;
  protected readonly rangeChange = this.#store.rangeChange;
  protected readonly reconstructed = this.#store.reconstructed;
  protected readonly range = this.#store.range;
  protected readonly movers = this.#store.movers;

  protected readonly isEmpty = computed(() => this.totalState() === 'empty');

  protected readonly chartFormats = computed(() => chartFormats(this.#locale, this.#masked(), this.range()));

  protected setRange(value: ChartRange): void {
    this.#store.range.set(value);
  }

  protected retryTotal(): void {
    this.#store.retryTotal();
  }

  protected retryMovers(): void {
    this.#store.retryMovers();
  }

  protected retryCurve(): void {
    this.#store.retryCurve();
  }

  protected retryEnvelopes(): void {
    this.#store.retryEnvelopes();
  }
}

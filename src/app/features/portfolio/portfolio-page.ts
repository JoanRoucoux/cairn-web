import { Component, LOCALE_ID, computed, inject } from '@angular/core';

import { type SegmentedOption, UiButton, UiCard, UiSegmented, UiSkeleton } from '@joanroucoux/cairn-ui';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { LanguageStore } from '@core/i18n/language-store';

import { CHART_RANGES, type ChartRange } from '@shared/chart/chart-range';
import { LineChart } from '@shared/chart/line-chart';

import { EnvelopeCard } from './envelopes/envelope-card';
import { PortfolioHero } from './hero/portfolio-hero';
import { PortfolioMovers } from './movers/portfolio-movers';
import { PortfolioStore } from './portfolio-store';
import { StaleQuotesBanner } from './stale/stale-quotes-banner';
import { UnvaluedBanner } from './unvalued/unvalued-banner';

@Component({
  selector: 'app-portfolio-page',
  imports: [
    EnvelopeCard,
    LineChart,
    PortfolioHero,
    PortfolioMovers,
    StaleQuotesBanner,
    TranslocoPipe,
    UiButton,
    UiCard,
    UiSegmented,
    UiSkeleton,
    UnvaluedBanner,
  ],
  templateUrl: './portfolio-page.html',
  providers: [PortfolioStore],
})
export class PortfolioPage {
  #store = inject(PortfolioStore);
  #transloco = inject(TranslocoService);
  #language = inject(LanguageStore);
  #locale = inject(LOCALE_ID);

  protected readonly portfolio = this.#store.portfolio;
  protected readonly performance = this.#store.performance;
  protected readonly performanceValue = this.#store.performanceValue;
  protected readonly range = this.#store.range;
  protected readonly points = this.#store.points;
  protected readonly reconstructed = this.#store.reconstructed;
  protected readonly rangeLoading = this.#store.rangeLoading;
  protected readonly rangeError = this.#store.rangeError;

  // chart.* lives in the preloaded global i18n file (no lazy scope to race), so reacting
  // to language changes through LanguageStore is enough.
  protected readonly rangeOptions = computed<SegmentedOption[]>(() => {
    this.#language.activeLang();
    return CHART_RANGES.map((value) => ({ value, label: this.#transloco.translate(`chart.range.${value}`) }));
  });

  protected readonly valueFormat = computed(() => {
    const format = new Intl.NumberFormat(this.#locale, {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    });

    return (value: number): string => format.format(value);
  });

  protected readonly changeFormat = computed(() => {
    const format = new Intl.NumberFormat(this.#locale, {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
      signDisplay: 'exceptZero',
    });

    return (value: number): string => format.format(value);
  });

  // The axis stays discreet: hours for a one-day span, dates otherwise. A bare hour ("11") reads
  // as nothing in English, unlike French where the locale's own "11 h" already carries a unit -
  // English needs the minutes forced on to read as a time ("11:00").
  protected readonly axisFormat = computed(() => {
    const isFrench = this.#locale.toLowerCase().startsWith('fr');
    const format =
      this.range() === '1d'
        ? new Intl.DateTimeFormat(
            this.#locale,
            isFrench
              ? { hour: 'numeric', timeZone: 'Europe/Paris' }
              : { hour: 'numeric', minute: '2-digit', timeZone: 'Europe/Paris' },
          )
        : new Intl.DateTimeFormat(this.#locale, { day: 'numeric', month: 'short', timeZone: 'Europe/Paris' });

    return (time: number): string => format.format(time);
  });

  protected readonly tooltipTimeFormat = computed(() => {
    const format =
      this.range() === '1d'
        ? new Intl.DateTimeFormat(this.#locale, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
        : new Intl.DateTimeFormat(this.#locale, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            timeZone: 'Europe/Paris',
          });

    return (time: number): string => format.format(time);
  });

  // Built as a key and plain params, not translated here: `TranslocoService.translate()` runs once
  // and does not react to the lazy `portfolio` scope finishing its async load, unlike the
  // `transloco` pipe the template binds these to.
  protected readonly chartSummaryKey = computed(() =>
    this.points().length > 0 ? 'portfolio.chartSummary' : 'portfolio.chartLabel',
  );

  protected readonly chartSummaryParams = computed(() => {
    const points = this.points();

    if (points.length === 0) {
      return {};
    }

    const first = points[0] as (typeof points)[number];
    const last = points.at(-1) as (typeof points)[number];
    const timeFormat = this.tooltipTimeFormat();

    return {
      from: timeFormat(first.t),
      to: timeFormat(last.t),
      change: this.changeFormat()(last.v - first.v),
    };
  });

  // The library types the option value as `string`; every option here is built from CHART_RANGES.
  protected setRange(value: string): void {
    this.range.set(value as ChartRange);
  }

  protected retry(): void {
    this.#store.retryRange();
  }
}

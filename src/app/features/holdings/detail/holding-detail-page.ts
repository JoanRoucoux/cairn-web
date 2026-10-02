import { Location, NgTemplateOutlet } from '@angular/common';
import { Component, LOCALE_ID, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  type AsyncState,
  type ChartPoint,
  type SegmentedOption,
  UI_AMOUNT_MASKED,
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
} from '@joanroucoux/cairn-ui';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LucideEllipsis, LucidePencil, LucideTrash, LucideX } from '@lucide/angular';

import { LanguageStore } from '@core/i18n/language-store';

import { chartFormats } from '@shared/chart/chart-formats';
import { CHART_RANGES, type ChartRange } from '@shared/chart/chart-range';
import { FocusOnInit } from '@shared/focus/focus-on-init';
import { AmountSeparator } from '@shared/format/amount-separator';
import { RatioPipe } from '@shared/format/ratio-pipe';
import { injectDesktop } from '@shared/layout/desktop-media';

import { HoldingDetailBar } from './bar/holding-detail-bar';
import { HoldingDetailDescription } from './description/holding-detail-description';
import { HoldingDetailDialogs } from './dialogs/holding-detail-dialogs';
import { HoldingDetailFacts } from './facts/holding-detail-facts';
import { HoldingDetailFigures } from './figures/holding-detail-figures';
import { HoldingDetailStore } from './holding-detail-store';
import { HoldingDetailMissing } from './missing/holding-detail-missing';
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
    HoldingDetailMissing,
    LucideEllipsis,
    LucidePencil,
    LucideTrash,
    LucideX,
    NgTemplateOutlet,
    RatioPipe,
    RouterLink,
    TranslocoPipe,
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
  ],
  templateUrl: './holding-detail-page.html',
  providers: [HoldingDetailStore],
  host: {
    class: 'block',
    '[animate.enter]': 'panelEnter()',
    '[animate.leave]': 'panelLeave()',
  },
})
export class HoldingDetailPage {
  #store = inject(HoldingDetailStore);
  #router = inject(Router);
  #location = inject(Location);
  #transloco = inject(TranslocoService);
  #language = inject(LanguageStore);
  #locale = inject(LOCALE_ID);
  #masked = inject(UI_AMOUNT_MASKED);

  readonly #desktop = injectDesktop();
  readonly #queryParams = toSignal(inject(ActivatedRoute).queryParams, { requireSync: true });

  protected readonly panelEnter = computed(() => (this.#desktop() ? 'ui-enter-panel' : null));
  protected readonly panelLeave = computed(() => (this.#desktop() ? 'ui-leave-fade' : null));

  protected readonly listHref = computed(() =>
    this.#router.serializeUrl(this.#router.createUrlTree(['/holdings'], { queryParams: this.#queryParams() })),
  );

  protected readonly menu = viewChild.required<UiMenu>('menu');

  protected readonly holding = this.#store.holding;
  protected readonly holdings = this.#store.holdings;
  protected readonly missingState = computed<AsyncState>(() =>
    this.holdings.error() ? 'error' : this.holdings.isLoading() ? 'loading' : 'empty',
  );
  protected readonly instrument = this.#store.instrument;
  protected readonly points = this.#store.points;
  protected readonly range = this.#store.range;
  protected readonly rangeChange = computed(() => (this.#store.quotesFailed() ? undefined : this.#store.rangeChange()));
  protected readonly chartState = computed<AsyncState>(() => (this.#store.quotesFailed() ? 'error' : 'ready'));
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

  protected onQuoteSaved(): void {
    this.pricingInstrument.set(undefined);
  }

  protected onQuoteDismissed(): void {
    this.pricingInstrument.set(undefined);
  }

  protected onSold(result: SellResult): void {
    this.sellOpen.set(false);

    if (result.outcome === 'closed') {
      this.backToList();
    }
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

  protected onBack(event: MouseEvent): void {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    this.backToList();
  }

  private backToList(): void {
    if (this.listIsPreviousEntry()) {
      this.#location.back();
    } else {
      void this.#router.navigate(['/holdings'], { queryParamsHandling: 'preserve' });
    }
  }

  private listIsPreviousEntry(): boolean {
    const previous = this.#router.lastSuccessfulNavigation()?.previousNavigation?.finalUrl;

    return previous !== undefined && this.#router.serializeUrl(previous).split(/[?#]/)[0] === '/holdings';
  }
}

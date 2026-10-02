import { Component, booleanAttribute, computed, input, output } from '@angular/core';

import {
  type AsyncState,
  UiAsync,
  UiButton,
  UiCard,
  UiField,
  UiFieldLeading,
  UiInput,
  UiRow,
  UiSkeleton,
} from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideSearch } from '@lucide/angular';

import type { InstrumentCandidateResponse, InstrumentResponse } from '@core/api-client/cairnAPI.schemas';

import { pluralKey } from '@shared/format/plural-key';

import { isinOf } from '../isin';
import { HoldingAddCandidate } from './candidate/holding-add-candidate';

export type CatalogResult = {
  instrument: InstrumentResponse;
  lineCount: number | null;
  foreignCurrency?: string;
};

@Component({
  selector: 'app-holding-add-search',
  imports: [
    HoldingAddCandidate,
    LucideSearch,
    TranslocoPipe,
    UiAsync,
    UiCard,
    UiButton,
    UiField,
    UiFieldLeading,
    UiInput,
    UiRow,
    UiSkeleton,
  ],
  templateUrl: './holding-add-search.html',
})
export class HoldingAddSearch {
  readonly query = input.required<string>();
  readonly catalogResults = input.required<CatalogResult[]>();
  readonly candidates = input.required<InstrumentCandidateResponse[]>();
  readonly searchingOnline = input.required<boolean>();
  readonly onlineError = input.required<boolean>();
  readonly onlineSearched = input.required<boolean>();
  readonly replacing = input(false, { transform: booleanAttribute });
  readonly busy = input(false, { transform: booleanAttribute });

  readonly queryInput = output<Event>();
  readonly pickedCatalog = output<InstrumentResponse>();
  readonly pickedOnline = output<InstrumentCandidateResponse>();
  readonly pickedManual = output<void>();
  readonly retried = output<void>();

  protected readonly showResults = computed(() => this.query().trim().length >= 2);
  protected readonly showOnline = computed(() => this.query().trim().length >= 3);
  protected readonly onlineLoading = computed(
    () => this.searchingOnline() || (!this.onlineSearched() && !this.onlineError()),
  );
  protected readonly onlineState = computed<AsyncState>(() =>
    this.onlineLoading() ? 'loading' : this.onlineError() ? 'error' : 'ready',
  );
  protected readonly notFoundKey = computed(() =>
    this.replacing() ? 'holdings.replace.notFound' : 'holdings.add.notFound',
  );
  protected readonly typedIsin = computed(() => isinOf(this.query()));

  protected lineCountKey(count: number): string {
    return count === 0 ? 'holdings.add.noLine' : pluralKey('holdings.add.lineCount', count);
  }

  protected candidateSub(candidate: InstrumentCandidateResponse): string {
    return [candidate.isin ?? this.typedIsin(), candidate.exchange, candidate.symbol ?? candidate.sourceRef]
      .filter(Boolean)
      .join(' · ');
  }
}

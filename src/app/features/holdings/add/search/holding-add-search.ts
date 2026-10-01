import { Component, computed, input, output } from '@angular/core';

import { UiAmount, UiButton, UiField, UiFieldLeading, UiInput, UiRow, UiSkeleton } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideRotateCw, LucideSearch } from '@lucide/angular';

import type { InstrumentCandidateResponse, InstrumentResponse } from '@core/api-client/cairnAPI.schemas';

import { pluralKey } from '@shared/format/plural-key';

export type CatalogResult = { instrument: InstrumentResponse; lineCount: number };

const ISIN = /^[A-Z]{2}[A-Z0-9]{9}\d$/i;

@Component({
  selector: 'app-holding-add-search',
  imports: [
    LucideRotateCw,
    LucideSearch,
    TranslocoPipe,
    UiAmount,
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
  protected readonly typedIsin = computed(() =>
    ISIN.test(this.query().trim()) ? this.query().trim().toUpperCase() : null,
  );

  protected lineCountKey(count: number): string {
    return count === 0 ? 'holdings.add.noLine' : pluralKey('holdings.add.lineCount', count);
  }

  protected candidateSub(candidate: InstrumentCandidateResponse): string {
    return [this.typedIsin(), candidate.exchange, candidate.sourceRef].filter(Boolean).join(' · ');
  }
}

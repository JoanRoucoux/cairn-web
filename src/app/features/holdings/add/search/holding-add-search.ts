import { Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import type { AsyncState } from '@joanroucoux/cairn-ui/async';
import { UiButton } from '@joanroucoux/cairn-ui/button';
import { UiCard } from '@joanroucoux/cairn-ui/card';
import { UiField, UiFieldLeading } from '@joanroucoux/cairn-ui/field';
import { type FilterChipOption, UiFilterChips } from '@joanroucoux/cairn-ui/filter-chips';
import { UiInput } from '@joanroucoux/cairn-ui/input';
import { UiResultGroup } from '@joanroucoux/cairn-ui/result-group';
import { UiRow, UiRowGroup } from '@joanroucoux/cairn-ui/row';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LucideSearch } from '@lucide/angular';

import type { HoldingResponse, InstrumentCandidateResponse, SearchableSource } from '@core/api-client/cairnAPI.schemas';

import type { ResultGroup } from '../result-groups';
import { SOURCE_FILTERS, type SourceFilter } from '../search-plan';
import { HoldingAddGroup } from './group/holding-add-group';
import { HoldingAddTracked } from './tracked/holding-add-tracked';

@Component({
  selector: 'app-holding-add-search',
  imports: [
    HoldingAddGroup,
    HoldingAddTracked,
    LucideSearch,
    TranslocoPipe,
    UiButton,
    UiCard,
    UiField,
    UiFieldLeading,
    UiFilterChips,
    UiInput,
    UiResultGroup,
    UiRow,
    UiRowGroup,
  ],
  templateUrl: './holding-add-search.html',
  host: { class: 'flex flex-col gap-4' },
})
export class HoldingAddSearch {
  readonly query = input.required<string>();
  readonly filter = input.required<SourceFilter>();
  readonly showResults = input.required<boolean>();
  readonly tracked = input.required<HoldingResponse[]>();
  readonly trackedState = input.required<AsyncState>();
  readonly groups = input.required<ResultGroup[]>();
  readonly noneFound = input.required<boolean>();
  readonly narrowed = input.required<boolean>();

  readonly queryInput = output<Event>();
  readonly filterChange = output<SourceFilter>();
  readonly pickedTracked = output<HoldingResponse>();
  readonly pickedCandidate = output<InstrumentCandidateResponse>();
  readonly retried = output<SearchableSource>();
  readonly retriedTracked = output<void>();
  readonly siriusOpened = output<void>();
  readonly manualOpened = output<void>();

  readonly #transloco = inject(TranslocoService);
  readonly #translocoEvents = toSignal(this.#transloco.events$);

  protected readonly filterOptions = computed<FilterChipOption[]>(() => {
    this.#translocoEvents();

    return SOURCE_FILTERS.map((value) => ({
      value,
      label: this.#transloco.translate(value === 'ALL' ? 'holdings.add.allSources' : `enums.priceSource.${value}`),
    }));
  });

  protected readonly showTracked = computed(() => this.trackedState() !== 'ready' || this.tracked().length > 0);

  protected chooseFilter(value: string): void {
    this.filterChange.emit(value as SourceFilter);
  }

  protected searchAll(): void {
    this.filterChange.emit('ALL');
  }
}

import { Component, input, output } from '@angular/core';

import { UiAmount, UiButton, UiField, UiInput } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import type { InstrumentCandidateResponse, InstrumentResponse } from '@core/api-client/cairnAPI.schemas';

@Component({
  selector: 'app-holding-add-search',
  imports: [TranslocoPipe, UiAmount, UiButton, UiField, UiInput],
  templateUrl: './holding-add-search.html',
})
export class HoldingAddSearch {
  readonly query = input.required<string>();
  readonly filteredCatalog = input.required<InstrumentResponse[]>();
  readonly candidates = input.required<InstrumentCandidateResponse[]>();
  readonly searchingOnline = input.required<boolean>();
  readonly onlineError = input.required<boolean>();
  readonly onlineSearched = input.required<boolean>();

  readonly queryInput = output<Event>();
  readonly pickedCatalog = output<InstrumentResponse>();
  readonly pickedOnline = output<InstrumentCandidateResponse>();
  readonly pickedManual = output<void>();
  readonly retried = output<void>();
}

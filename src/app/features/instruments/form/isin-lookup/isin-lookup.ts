import { Component, input, output, signal } from '@angular/core';

import { TranslocoPipe } from '@jsverse/transloco';
import { UiButton, UiInput } from 'cairn-ui';

import type { InstrumentCandidateResponse } from '@core/api-client/cairnAPI.schemas';

import { MoneyPipe } from '@shared/format/money-pipe';

@Component({
  selector: 'app-isin-lookup',
  imports: [MoneyPipe, TranslocoPipe, UiButton, UiInput],
  templateUrl: './isin-lookup.html',
})
export class IsinLookup {
  readonly candidates = input.required<InstrumentCandidateResponse[]>();
  readonly searching = input.required<boolean>();
  readonly notFound = input.required<boolean>();

  readonly searched = output<string>();
  readonly picked = output<InstrumentCandidateResponse>();

  protected readonly query = signal('');

  protected onQueryInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected onSearch(): void {
    const query = this.query().trim();

    if (query) {
      this.searched.emit(query);
    }
  }
}

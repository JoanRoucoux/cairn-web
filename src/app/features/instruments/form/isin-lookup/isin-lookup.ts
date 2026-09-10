import { Component, input, output, signal } from '@angular/core';

import { UiButton, UiField, UiInput } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import type { InstrumentCandidateResponse } from '@core/api-client/cairnAPI.schemas';

import { MoneyPipe } from '@shared/format/money-pipe';

@Component({
  selector: 'app-isin-lookup',
  imports: [MoneyPipe, TranslocoPipe, UiButton, UiField, UiInput],
  templateUrl: './isin-lookup.html',
})
export class IsinLookup {
  readonly candidates = input.required<InstrumentCandidateResponse[]>();
  readonly searching = input.required<boolean>();
  readonly notFound = input.required<boolean>();

  readonly searched = output<string>();
  readonly picked = output<InstrumentCandidateResponse>();

  protected readonly query = signal('');
  protected readonly blank = signal(false);

  protected onQueryInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.blank.set(false);
  }

  protected onSearch(): void {
    const query = this.query().trim();

    if (!query) {
      this.blank.set(true);
      return;
    }

    this.searched.emit(query);
  }
}

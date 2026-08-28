import { Component, inject } from '@angular/core';

import { TranslocoPipe } from '@jsverse/transloco';
import { UiCard } from 'cairn-ui';

import { RelativeDatePipe } from '@shared/format/relative-date-pipe';

import { SourceListStore } from './source-list-store';

@Component({
  selector: 'app-source-list-page',
  imports: [RelativeDatePipe, TranslocoPipe, UiCard],
  templateUrl: './source-list-page.html',
})
export class SourceListPage {
  #store = inject(SourceListStore);

  protected readonly sources = this.#store.sources;
  protected readonly runs = this.#store.runs;
  protected readonly refreshing = this.#store.refreshing;
  protected readonly report = this.#store.report;
  protected readonly error = this.#store.error;

  protected async onRefresh(): Promise<void> {
    await this.#store.refresh();
  }
}

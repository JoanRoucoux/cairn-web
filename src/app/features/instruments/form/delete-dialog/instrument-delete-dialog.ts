import { Component, inject, input, output, signal } from '@angular/core';

import { UiButton, UiDialog } from '@joanroucoux/cairn-ui';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import type { InstrumentDetailResponse } from '@core/api-client/cairnAPI.schemas';

import { InstrumentDeleteStore } from './instrument-delete-store';

@Component({
  selector: 'app-instrument-delete-dialog',
  imports: [TranslocoPipe, UiButton, UiDialog],
  templateUrl: './instrument-delete-dialog.html',
  providers: [InstrumentDeleteStore],
})
export class InstrumentDeleteDialog {
  #store = inject(InstrumentDeleteStore);
  #transloco = inject(TranslocoService);

  readonly instrument = input.required<InstrumentDetailResponse>();
  readonly deleted = output<void>();
  readonly dismissed = output<void>();

  // The parent creates this component to open the dialog: it is open from its first render.
  protected readonly open = signal(true);
  protected readonly deleting = this.#store.deleting;
  protected readonly error = this.#store.error;

  // description is a plain string input, so the interpolation happens here rather than in the template.
  protected description(): string {
    return this.#transloco.translate('instruments.delete.description', {
      name: this.instrument().name,
      count: this.instrument().holdingCount,
    });
  }

  protected dismiss(): void {
    this.open.set(false);
    this.dismissed.emit();
  }

  protected async confirm(): Promise<void> {
    if (await this.#store.remove(this.instrument().id)) {
      this.open.set(false);
      this.deleted.emit();
    }
  }
}

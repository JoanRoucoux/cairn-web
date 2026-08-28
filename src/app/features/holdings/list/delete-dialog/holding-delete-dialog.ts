import { Component, inject, input, output, signal } from '@angular/core';

import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { UiButton, UiDialog } from 'cairn-ui';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { HoldingDeleteStore } from './holding-delete-store';

@Component({
  selector: 'app-holding-delete-dialog',
  imports: [TranslocoPipe, UiButton, UiDialog],
  templateUrl: './holding-delete-dialog.html',
  providers: [HoldingDeleteStore],
})
export class HoldingDeleteDialog {
  #store = inject(HoldingDeleteStore);
  #transloco = inject(TranslocoService);

  readonly holding = input.required<HoldingResponse>();
  readonly deleted = output<void>();
  readonly dismissed = output<void>();

  // The parent creates this component to open the dialog: it is open from its first render.
  protected readonly open = signal(true);
  protected readonly deleting = this.#store.deleting;
  protected readonly error = this.#store.error;

  // description is a plain string input, so the interpolation happens here rather than in the template.
  protected description(): string {
    return this.#transloco.translate('holdings.delete.description', { name: this.holding().instrumentName });
  }

  protected dismiss(): void {
    this.open.set(false);
    this.dismissed.emit();
  }

  protected async confirm(): Promise<void> {
    if (await this.#store.remove(this.holding().id)) {
      this.open.set(false);
      this.deleted.emit();
    }
  }
}

import { Component, inject, input, output } from '@angular/core';

import { UiAlert } from '@joanroucoux/cairn-ui/alert';
import { UiButton } from '@joanroucoux/cairn-ui/button';
import { UiDialog } from '@joanroucoux/cairn-ui/dialog';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { injectDialogOutcome } from '@shared/dialog/dialog-outcome';
import { injectToast } from '@shared/feedback/toast';

import { InstrumentDeleteStore } from './instrument-delete-store';

export type DeletableInstrument = {
  id: string;
  name: string;
  holdingCount: number;
};

@Component({
  selector: 'app-instrument-delete-dialog',
  imports: [TranslocoPipe, UiAlert, UiButton, UiDialog],
  templateUrl: './instrument-delete-dialog.html',
  providers: [InstrumentDeleteStore],
})
export class InstrumentDeleteDialog {
  #store = inject(InstrumentDeleteStore);
  #transloco = inject(TranslocoService);

  readonly instrument = input.required<DeletableInstrument>();
  readonly deleted = output<void>();
  readonly dismissed = output<void>();

  #toast = injectToast();
  readonly #outcome = injectDialogOutcome<void>(() => this.#toast('instruments.toasts.deleted'));

  // The parent creates this component to open the dialog: it is open from its first render.
  protected readonly open = this.#outcome.open;
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
    this.#outcome.dismiss();
  }

  protected onClosed(): void {
    const result = this.#outcome.settle();

    if (result) {
      this.deleted.emit();
    } else {
      this.dismissed.emit();
    }
  }

  protected async confirm(): Promise<void> {
    if (await this.#store.remove(this.instrument().id)) {
      this.#outcome.succeed();
    }
  }
}

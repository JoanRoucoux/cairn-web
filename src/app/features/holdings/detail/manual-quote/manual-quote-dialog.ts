import { Component, inject, input, output, signal } from '@angular/core';
import { FormField } from '@angular/forms/signals';

import { TranslocoPipe } from '@jsverse/transloco';
import { UiButton, UiDialog, UiField, UiInput } from 'cairn-ui';

import { ManualQuoteDialogStore } from './manual-quote-dialog-store';

@Component({
  selector: 'app-manual-quote-dialog',
  imports: [FormField, TranslocoPipe, UiButton, UiDialog, UiField, UiInput],
  templateUrl: './manual-quote-dialog.html',
  providers: [ManualQuoteDialogStore],
})
export class ManualQuoteDialog {
  #store = inject(ManualQuoteDialogStore);

  readonly instrumentId = input.required<string>();
  readonly instrumentName = input.required<string>();
  readonly saved = output<void>();
  readonly dismissed = output<void>();

  // The parent creates this component to open the dialog: it is open from its first render.
  protected readonly open = signal(true);
  protected readonly form = this.#store.form;
  protected readonly error = this.#store.error;

  protected dismiss(): void {
    this.open.set(false);
    this.dismissed.emit();
  }

  protected async confirm(): Promise<void> {
    if (await this.#store.save(this.instrumentId())) {
      this.open.set(false);
      this.saved.emit();
    }
  }
}

import { Component, ElementRef, afterRenderEffect, inject, input, output, signal } from '@angular/core';
import { FormField } from '@angular/forms/signals';

import { UiButton, UiDialog, UiField, UiInput } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import { focusInitial } from '@shared/dialog/focus-initial';

import { ManualQuoteDialogStore } from './manual-quote-dialog-store';

@Component({
  selector: 'app-manual-quote-dialog',
  imports: [FormField, TranslocoPipe, UiButton, UiDialog, UiField, UiInput],
  templateUrl: './manual-quote-dialog.html',
  providers: [ManualQuoteDialogStore],
})
export class ManualQuoteDialog {
  #store = inject(ManualQuoteDialogStore);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly instrumentId = input.required<string>();
  readonly instrumentName = input.required<string>();
  readonly saved = output<void>();
  readonly dismissed = output<void>();

  // The parent creates this component to open the dialog: it is open from its first render.
  protected readonly open = signal(true);
  protected readonly form = this.#store.form;
  protected readonly error = this.#store.error;

  constructor() {
    // The close cross is the first focusable descendant: showModal() would focus it instead of the field.
    afterRenderEffect(() => {
      if (this.open() && this.#host.nativeElement.querySelector('dialog')?.open) {
        focusInitial(this.#host.nativeElement, 'manual-quote-as-of');
      }
    });
  }

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

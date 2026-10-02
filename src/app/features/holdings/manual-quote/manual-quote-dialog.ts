import { Component, ElementRef, afterRenderEffect, inject, input, output } from '@angular/core';
import { FormField } from '@angular/forms/signals';

import { UiAlert, UiButton, UiDialog, UiField, UiInput } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import { injectDialogOutcome } from '@shared/dialog/dialog-outcome';
import { focusInitial } from '@shared/dialog/focus-initial';
import { injectToast } from '@shared/feedback/toast';

import { type HoldingChange, HoldingChanges } from '../holding-changes';
import { ManualQuoteDialogStore } from './manual-quote-dialog-store';

@Component({
  selector: 'app-manual-quote-dialog',
  imports: [FormField, TranslocoPipe, UiAlert, UiButton, UiDialog, UiField, UiInput],
  templateUrl: './manual-quote-dialog.html',
  providers: [ManualQuoteDialogStore],
})
export class ManualQuoteDialog {
  #store = inject(ManualQuoteDialogStore);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly holdingId = input.required<string>();
  readonly instrumentId = input.required<string>();
  readonly instrumentName = input.required<string>();
  readonly saved = output<void>();
  readonly dismissed = output<void>();

  #toast = injectToast();
  #changes = inject(HoldingChanges);
  readonly #outcome = injectDialogOutcome<HoldingChange>((change) => {
    this.#toast('holdings.toasts.quoteSaved');
    this.#changes.reveal(change);
  });

  // The parent creates this component to open the dialog: it is open from its first render.
  protected readonly open = this.#outcome.open;
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
    this.#outcome.dismiss();
  }

  protected onClosed(): void {
    const result = this.#outcome.settle();

    if (result) {
      this.saved.emit();
    } else {
      this.dismissed.emit();
    }
  }

  protected async confirm(): Promise<void> {
    if (await this.#store.save(this.instrumentId())) {
      this.#outcome.succeed(this.#changes.touched(this.holdingId()));
    }
  }
}

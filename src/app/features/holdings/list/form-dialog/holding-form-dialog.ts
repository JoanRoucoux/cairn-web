import { Component, ElementRef, afterRenderEffect, effect, inject, input, output, signal } from '@angular/core';
import { FormField } from '@angular/forms/signals';

import { TranslocoPipe } from '@jsverse/transloco';
import { UiButton, UiDialog, UiField, UiInput, UiSelect } from 'cairn-ui';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { HoldingFormDialogStore } from './holding-form-dialog-store';

@Component({
  selector: 'app-holding-form-dialog',
  imports: [FormField, TranslocoPipe, UiButton, UiDialog, UiField, UiInput, UiSelect],
  templateUrl: './holding-form-dialog.html',
  providers: [HoldingFormDialogStore],
})
export class HoldingFormDialog {
  #store = inject(HoldingFormDialogStore);

  readonly holding = input<HoldingResponse | undefined>(undefined);
  readonly savedForm = output<void>();
  readonly dismissed = output<void>();

  // The parent creates this component to open the dialog: it is open from its first render.
  protected readonly open = signal(true);
  protected readonly form = this.#store.form;
  protected readonly error = this.#store.error;
  protected readonly accounts = this.#store.accounts;
  protected readonly instruments = this.#store.instruments;

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    effect(() => this.#store.prefill(this.holding()));

    // showModal() focuses the first focusable descendant by default, which would be a form
    // field: pull focus back onto the safe action once the dialog has rendered open.
    afterRenderEffect(() => {
      if (this.open() && this.#host.nativeElement.querySelector('dialog')?.open) {
        this.#host.nativeElement.querySelector<HTMLButtonElement>('[data-testid="holding-form-cancel"]')?.focus();
      }
    });
  }

  protected dismiss(): void {
    this.open.set(false);
    this.dismissed.emit();
  }

  protected async confirm(): Promise<void> {
    if (await this.#store.save(this.holding()?.id)) {
      this.open.set(false);
      this.savedForm.emit();
    }
  }
}

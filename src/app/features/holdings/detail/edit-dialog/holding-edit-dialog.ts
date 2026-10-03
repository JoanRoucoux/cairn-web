import { Component, ElementRef, afterRenderEffect, effect, inject, input, output } from '@angular/core';
import { FormField } from '@angular/forms/signals';

import { UiAlert, UiButton, UiDialog, UiField, UiInput } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { injectDialogOutcome } from '@shared/dialog/dialog-outcome';
import { focusInitial } from '@shared/dialog/focus-initial';
import { injectToast } from '@shared/feedback/toast';

import { type HoldingChange, HoldingChanges } from '../../holding-changes';
import { HoldingEditDialogStore } from './holding-edit-dialog-store';

@Component({
  selector: 'app-holding-edit-dialog',
  imports: [FormField, TranslocoPipe, UiAlert, UiButton, UiDialog, UiField, UiInput],
  templateUrl: './holding-edit-dialog.html',
  providers: [HoldingEditDialogStore],
})
export class HoldingEditDialog {
  #store = inject(HoldingEditDialogStore);

  readonly holding = input.required<HoldingResponse>();
  readonly savedForm = output<HoldingResponse>();
  readonly dismissed = output<void>();

  #toast = injectToast();
  #changes = inject(HoldingChanges);
  readonly #outcome = injectDialogOutcome<{ holding: HoldingResponse; change: HoldingChange }>(({ change }) => {
    this.#toast('holdings.toasts.edited');
    this.#changes.reveal(change);
  });

  // The parent creates this component to open the dialog: it is open from its first render.
  protected readonly open = this.#outcome.open;
  protected readonly form = this.#store.form;
  protected readonly error = this.#store.error;

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    effect(() => this.#store.prefill(this.holding()));

    // showModal() focuses the first focusable descendant by default, which would be a form
    // field: pull focus back onto the safe action once the dialog has rendered open.
    afterRenderEffect(() => {
      if (this.open() && this.#host.nativeElement.querySelector('dialog')?.open) {
        focusInitial(this.#host.nativeElement, 'holding-edit-cancel', 'holding-edit-quantity');
      }
    });
  }

  protected dismiss(): void {
    this.#outcome.dismiss();
  }

  protected onClosed(): void {
    const result = this.#outcome.settle();

    if (result) {
      this.savedForm.emit(result.value.holding);
    } else {
      this.dismissed.emit();
    }
  }

  protected async confirm(): Promise<void> {
    const saved = await this.#store.save(this.holding().id);

    if (saved) {
      this.#outcome.succeed({ holding: saved, change: this.#changes.touched(saved.id) });
    }
  }
}

import { Component, ElementRef, afterRenderEffect, effect, inject, input, output, signal } from '@angular/core';
import { FormField } from '@angular/forms/signals';

import { UiAlert, UiButton, UiDialog, UiField, UiInput } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import { focusInitial } from '@shared/dialog/focus-initial';

import { HoldingCashStore } from './holding-cash-store';

@Component({
  selector: 'app-holding-cash-dialog',
  imports: [FormField, TranslocoPipe, UiAlert, UiButton, UiDialog, UiField, UiInput],
  templateUrl: './holding-cash-dialog.html',
  providers: [HoldingCashStore],
})
export class HoldingCashDialog {
  #store = inject(HoldingCashStore);

  readonly accountId = input.required<string>();
  readonly accountName = input.required<string>();
  readonly balance = input.required<number>();
  readonly saved = output<void>();
  readonly dismissed = output<void>();

  // The parent creates this component to open the dialog: it is open from its first render.
  protected readonly open = signal(true);
  protected readonly form = this.#store.form;
  protected readonly error = this.#store.error;

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    effect(() => this.#store.prefill(this.balance()));

    // showModal() focuses the first focusable descendant by default, which would be the amount
    // field: pull focus back onto the safe action once the dialog has rendered open.
    afterRenderEffect(() => {
      if (this.open() && this.#host.nativeElement.querySelector('dialog')?.open) {
        focusInitial(this.#host.nativeElement, 'holding-cash-cancel', 'holding-cash-amount');
      }
    });
  }

  #done = false;

  protected dismiss(): void {
    this.open.set(false);
  }

  protected onClosed(): void {
    if (this.#done) {
      this.saved.emit();
    } else {
      this.dismissed.emit();
    }
  }

  protected async confirm(): Promise<void> {
    if (await this.#store.save(this.accountId())) {
      this.#done = true;
      this.open.set(false);
    }
  }
}

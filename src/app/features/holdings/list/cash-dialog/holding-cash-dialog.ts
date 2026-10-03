import { Component, ElementRef, afterRenderEffect, effect, inject, input, output } from '@angular/core';
import { FormField } from '@angular/forms/signals';

import { UiAlert } from '@joanroucoux/cairn-ui/alert';
import { UiButton } from '@joanroucoux/cairn-ui/button';
import { UiDialog } from '@joanroucoux/cairn-ui/dialog';
import { UiField } from '@joanroucoux/cairn-ui/field';
import { UiInput } from '@joanroucoux/cairn-ui/input';
import { TranslocoPipe } from '@jsverse/transloco';

import { injectDialogOutcome } from '@shared/dialog/dialog-outcome';
import { focusInitial } from '@shared/dialog/focus-initial';
import { injectToast } from '@shared/feedback/toast';

import { type HoldingChange, HoldingChanges } from '../../holding-changes';
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
  readonly savings = input(false);
  readonly saved = output<void>();
  readonly dismissed = output<void>();

  #toast = injectToast();
  #changes = inject(HoldingChanges);
  readonly #outcome = injectDialogOutcome<HoldingChange>((change) => {
    this.#toast('holdings.toasts.balanceSaved');
    this.#changes.reveal(change);
  });

  // The parent creates this component to open the dialog: it is open from its first render.
  protected readonly open = this.#outcome.open;
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
    if (await this.#store.save(this.accountId())) {
      this.#outcome.succeed(this.#changes.balanceSet(this.accountId()));
    }
  }
}

import { Component, ElementRef, afterRenderEffect, inject, output } from '@angular/core';
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

import { ProfilePasskeyDialogStore } from './profile-passkey-dialog-store';

@Component({
  selector: 'app-profile-passkey-dialog',
  imports: [FormField, TranslocoPipe, UiAlert, UiButton, UiDialog, UiField, UiInput],
  templateUrl: './profile-passkey-dialog.html',
  providers: [ProfilePasskeyDialogStore],
})
export class ProfilePasskeyDialog {
  #store = inject(ProfilePasskeyDialogStore);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly registered = output<void>();
  readonly dismissed = output<void>();

  #toast = injectToast();
  readonly #outcome = injectDialogOutcome<void>(() => this.#toast('profile.toasts.passkeyAdded'));

  // The parent creates this component to open the dialog: it is open from its first render.
  protected readonly open = this.#outcome.open;
  protected readonly form = this.#store.form;
  protected readonly submitting = this.#store.submitting;
  protected readonly unsupported = this.#store.unsupported;
  protected readonly failed = this.#store.failed;

  constructor() {
    // The close cross is the first focusable descendant: showModal() would focus it instead of the field.
    afterRenderEffect(() => {
      if (this.open() && this.#host.nativeElement.querySelector('dialog')?.open) {
        focusInitial(this.#host.nativeElement, 'passkey-label');
      }
    });
  }

  protected dismiss(): void {
    this.#outcome.dismiss();
  }

  protected onClosed(): void {
    const result = this.#outcome.settle();

    if (result) {
      this.registered.emit();
    } else {
      this.dismissed.emit();
    }
  }

  protected async onSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();

    if (await this.#store.register()) {
      this.#outcome.succeed();
    }
  }
}

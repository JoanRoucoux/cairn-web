import { Component, ElementRef, afterRenderEffect, inject, output, signal } from '@angular/core';
import { FormField } from '@angular/forms/signals';

import { UiAlert, UiButton, UiDialog, UiField, UiInput } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import { focusInitial } from '@shared/dialog/focus-initial';

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

  // The parent creates this component to open the dialog: it is open from its first render.
  protected readonly open = signal(true);
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

  #done = false;

  protected dismiss(): void {
    this.open.set(false);
  }

  protected onClosed(): void {
    if (this.#done) {
      this.registered.emit();
    } else {
      this.dismissed.emit();
    }
  }

  protected async onSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();

    if (await this.#store.register()) {
      this.#done = true;
      this.open.set(false);
    }
  }
}

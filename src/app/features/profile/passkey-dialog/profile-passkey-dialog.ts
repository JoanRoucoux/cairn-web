import { Component, inject, output, signal } from '@angular/core';
import { FormField } from '@angular/forms/signals';

import { UiButton, UiDialog, UiField, UiInput } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import { ProfilePasskeyDialogStore } from './profile-passkey-dialog-store';

@Component({
  selector: 'app-profile-passkey-dialog',
  imports: [FormField, TranslocoPipe, UiButton, UiDialog, UiField, UiInput],
  templateUrl: './profile-passkey-dialog.html',
  providers: [ProfilePasskeyDialogStore],
})
export class ProfilePasskeyDialog {
  #store = inject(ProfilePasskeyDialogStore);

  readonly registered = output<void>();
  readonly dismissed = output<void>();

  // The parent creates this component to open the dialog: it is open from its first render.
  protected readonly open = signal(true);
  protected readonly form = this.#store.form;
  protected readonly submitting = this.#store.submitting;
  protected readonly unsupported = this.#store.unsupported;
  protected readonly failed = this.#store.failed;

  protected dismiss(): void {
    this.open.set(false);
    this.dismissed.emit();
  }

  protected async register(): Promise<void> {
    if (await this.#store.register()) {
      this.open.set(false);
      this.registered.emit();
    }
  }
}

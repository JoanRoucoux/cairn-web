import { Component, inject, input, output } from '@angular/core';

import { UiAlert } from '@joanroucoux/cairn-ui/alert';
import { UiButton } from '@joanroucoux/cairn-ui/button';
import { UiDialog } from '@joanroucoux/cairn-ui/dialog';
import { TranslocoPipe } from '@jsverse/transloco';

import { injectDialogOutcome } from '@shared/dialog/dialog-outcome';
import { injectToast } from '@shared/feedback/toast';

import type { PasskeyView } from '../profile-store';
import { ProfilePasskeyDeleteStore } from './profile-passkey-delete-store';

@Component({
  selector: 'app-profile-passkey-delete-dialog',
  imports: [TranslocoPipe, UiAlert, UiButton, UiDialog],
  templateUrl: './profile-passkey-delete-dialog.html',
  providers: [ProfilePasskeyDeleteStore],
})
export class ProfilePasskeyDeleteDialog {
  #store = inject(ProfilePasskeyDeleteStore);

  readonly passkey = input.required<PasskeyView>();
  readonly deleted = output<void>();
  readonly dismissed = output<void>();

  #toast = injectToast();
  readonly #outcome = injectDialogOutcome<void>(() => this.#toast('profile.toasts.passkeyDeleted'));

  protected readonly open = this.#outcome.open;
  protected readonly deleting = this.#store.deleting;
  protected readonly refused = this.#store.refused;
  protected readonly failed = this.#store.failed;

  protected dismiss(): void {
    this.#outcome.dismiss();
  }

  protected onClosed(): void {
    const result = this.#outcome.settle();

    if (result) {
      this.deleted.emit();
    } else {
      this.dismissed.emit();
    }
  }

  protected async confirm(): Promise<void> {
    if (await this.#store.remove(this.passkey().credentialId)) {
      this.#outcome.succeed();
    }
  }
}

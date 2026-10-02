import { Component, inject, input, output, signal } from '@angular/core';

import { UiAlert, UiButton, UiDialog } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

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

  protected readonly open = signal(true);
  protected readonly deleting = this.#store.deleting;
  protected readonly refused = this.#store.refused;
  protected readonly failed = this.#store.failed;

  #done = false;

  protected dismiss(): void {
    this.open.set(false);
  }

  protected onClosed(): void {
    if (this.#done) {
      this.deleted.emit();
    } else {
      this.dismissed.emit();
    }
  }

  protected async confirm(): Promise<void> {
    if (await this.#store.remove(this.passkey().credentialId)) {
      this.#done = true;
      this.open.set(false);
    }
  }
}

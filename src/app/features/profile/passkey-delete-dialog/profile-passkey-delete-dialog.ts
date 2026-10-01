import { Component, Injector, afterNextRender, inject, input, output, signal } from '@angular/core';

import { UiButton, UiDialog } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import type { PasskeyView } from '../profile-store';
import { ProfilePasskeyDeleteStore } from './profile-passkey-delete-store';

@Component({
  selector: 'app-profile-passkey-delete-dialog',
  imports: [TranslocoPipe, UiButton, UiDialog],
  templateUrl: './profile-passkey-delete-dialog.html',
  providers: [ProfilePasskeyDeleteStore],
})
export class ProfilePasskeyDeleteDialog {
  #store = inject(ProfilePasskeyDeleteStore);
  #injector = inject(Injector);

  readonly passkey = input.required<PasskeyView>();
  readonly deleted = output<void>();
  readonly dismissed = output<void>();

  protected readonly open = signal(true);
  protected readonly deleting = this.#store.deleting;
  protected readonly refused = this.#store.refused;

  protected cancel(): void {
    this.open.set(false);
    afterNextRender(() => this.dismissed.emit(), { injector: this.#injector });
  }

  protected async confirm(): Promise<void> {
    if (await this.#store.remove(this.passkey().credentialId)) {
      this.open.set(false);
      this.deleted.emit();
    }
  }
}

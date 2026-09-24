import { Injectable, inject, signal } from '@angular/core';
import { form, submit } from '@angular/forms/signals';

import { PasskeyCeremony } from '@core/webauthn/passkey-ceremony';

import { formMessages } from '@shared/forms/form-messages';

import { initialPasskeyDraft, passkeyDraftSchema } from './profile-passkey-form';

@Injectable()
export class ProfilePasskeyDialogStore {
  #passkeyCeremony = inject(PasskeyCeremony);

  readonly #model = signal(initialPasskeyDraft());

  readonly #messages = formMessages();

  readonly form = form(this.#model, passkeyDraftSchema(this.#messages));

  readonly submitting = signal(false);
  readonly unsupported = signal(false);
  readonly failed = signal(false);

  async register(): Promise<boolean> {
    this.unsupported.set(false);
    this.failed.set(false);
    let registered = false;

    // submit() marks every field as touched and skips the ceremony while the form is invalid.
    await submit(this.form, async () => {
      this.submitting.set(true);

      try {
        const outcome = await this.#passkeyCeremony.register(this.#model().label.trim());

        switch (outcome) {
          case 'ok':
            registered = true;
            break;
          case 'cancelled':
            break;
          case 'unsupported':
            this.unsupported.set(true);
            break;
          case 'refused':
          case 'failed':
            this.failed.set(true);
            break;
        }
      } finally {
        this.submitting.set(false);
      }
    });

    return registered;
  }
}

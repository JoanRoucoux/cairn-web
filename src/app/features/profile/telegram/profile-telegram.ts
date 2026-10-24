import { Component, effect, inject, untracked } from '@angular/core';

import { UiAlert } from '@joanroucoux/cairn-ui/alert';
import { UiButton } from '@joanroucoux/cairn-ui/button';
import { UiCard } from '@joanroucoux/cairn-ui/card';
import { UiSkeleton } from '@joanroucoux/cairn-ui/skeleton';
import { TranslocoPipe } from '@jsverse/transloco';

import { injectErrorToast, injectToast } from '@shared/feedback/toast';

import { ProfileTelegramStore } from './profile-telegram-store';

@Component({
  selector: 'app-profile-telegram',
  imports: [TranslocoPipe, UiAlert, UiButton, UiCard, UiSkeleton],
  templateUrl: './profile-telegram.html',
  providers: [ProfileTelegramStore],
  host: { class: 'block' },
})
export class ProfileTelegram {
  #store = inject(ProfileTelegramStore);
  #toast = injectToast();
  #errorToast = injectErrorToast();

  protected readonly ready = this.#store.ready;
  protected readonly status = this.#store.status;
  protected readonly invitationUrl = this.#store.invitationUrl;
  protected readonly chatLabel = this.#store.chatLabel;
  protected readonly linkedAt = this.#store.linkedAt;
  protected readonly expired = this.#store.expired;
  protected readonly failed = this.#store.failed;
  protected readonly busy = this.#store.busy;

  #previous = this.#store.status();

  constructor() {
    effect(() => {
      const status = this.#store.status();
      const previous = untracked(() => this.#previous);

      this.#previous = status;

      if (previous === 'pending' && status === 'linked') {
        this.#toast('profile.toasts.telegramLinked');
      }
    });
  }

  protected async connect(): Promise<void> {
    await this.#store.connect();
  }

  protected async disconnect(): Promise<void> {
    if (await this.#store.disconnect()) {
      this.#toast('profile.toasts.telegramUnlinked');
    } else {
      this.#errorToast('profile.toasts.telegramDisconnectFailed');
    }
  }
}

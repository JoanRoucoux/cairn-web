import { DestroyRef, Injectable, LOCALE_ID, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { firstValueFrom } from 'rxjs';

import type { TelegramLinkResponse } from '@core/api-client/cairnAPI.schemas';
import { TelegramService } from '@core/api-client/telegram/telegram.service';

const POLL_INTERVAL_MS = 3000;

@Injectable()
export class ProfileTelegramStore {
  #telegramApiClient = inject(TelegramService);

  #dateFormat = new Intl.DateTimeFormat(inject(LOCALE_ID), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  #timer: ReturnType<typeof setInterval> | undefined;

  readonly #link = rxResource({
    stream: () => this.#telegramApiClient.getTelegramLink(),
  });

  readonly #failedAction = signal(false);

  readonly #current = signal<TelegramLinkResponse | undefined>(undefined);

  readonly #loaded = computed<TelegramLinkResponse | undefined>(
    () => this.#current() ?? (this.#link.hasValue() ? this.#link.value() : undefined),
  );

  readonly ready = computed(() => this.#loaded() !== undefined);
  readonly status = computed(() => this.#loaded()?.status ?? 'unavailable');
  readonly chatLabel = computed(() => this.#loaded()?.chatLabel ?? '');
  readonly linkedAt = computed(() => {
    const linkedAt = this.#loaded()?.linkedAt;

    return linkedAt ? this.#dateFormat.format(new Date(linkedAt)) : '';
  });
  readonly invitationUrl = signal<string | null>(null);
  readonly expired = signal(false);
  readonly failed = computed(() => this.#failedAction() || this.#link.error() !== undefined);
  readonly busy = signal(false);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.#stopPolling());
  }

  async connect(): Promise<boolean> {
    this.#begin();

    try {
      const invitation = await firstValueFrom(this.#telegramApiClient.startTelegramLink());

      this.invitationUrl.set(invitation.url);
      this.#current.set({ status: 'pending' });
      this.#startPolling(new Date(invitation.expiresAt).getTime());

      return true;
    } catch {
      this.#failedAction.set(true);

      return false;
    } finally {
      this.busy.set(false);
    }
  }

  async disconnect(): Promise<boolean> {
    this.#begin();

    try {
      await firstValueFrom(this.#telegramApiClient.unlinkTelegram());
      this.#stopPolling();
      this.invitationUrl.set(null);
      this.#current.set({ status: 'unlinked' });

      return true;
    } catch {
      this.#failedAction.set(true);

      return false;
    } finally {
      this.busy.set(false);
    }
  }

  #begin(): void {
    this.busy.set(true);
    this.#failedAction.set(false);
    this.expired.set(false);
  }

  #startPolling(expiresAt: number): void {
    this.#stopPolling();
    this.#timer = setInterval(() => void this.#check(expiresAt), POLL_INTERVAL_MS);
  }

  #stopPolling(): void {
    clearInterval(this.#timer);
    this.#timer = undefined;
  }

  async #check(expiresAt: number): Promise<void> {
    try {
      const response = await firstValueFrom(this.#telegramApiClient.checkTelegramLink());

      if (response.status === 'linked') {
        this.#stopPolling();
        this.invitationUrl.set(null);
        this.#current.set(response);
      } else if (response.status === 'unlinked' && Date.now() >= expiresAt) {
        this.#stopPolling();
        this.invitationUrl.set(null);
        this.expired.set(true);
        this.#current.set(response);
      }
    } catch {
      this.#stopPolling();
      this.#failedAction.set(true);
    }
  }
}

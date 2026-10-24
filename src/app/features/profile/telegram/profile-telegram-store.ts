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

  #timer: ReturnType<typeof setTimeout> | undefined;
  #generation = 0;

  readonly #link = rxResource({
    stream: () => this.#telegramApiClient.getTelegramLink(),
  });

  readonly #failedAction = signal(false);

  readonly #current = signal<TelegramLinkResponse | undefined>(undefined);

  readonly #loaded = computed<TelegramLinkResponse | undefined>(
    () => this.#current() ?? (this.#link.hasValue() ? this.#link.value() : undefined),
  );

  readonly #invitation = computed(() => {
    const url = this.invitationUrl();

    if (url === null || !URL.canParse(url)) {
      return null;
    }

    const parsed = new URL(url);
    const token = parsed.searchParams.get('start');

    return token ? { bot: parsed.pathname.slice(1), token } : null;
  });

  readonly ready = computed(() => this.#loaded() !== undefined);
  readonly invitationUrl = signal<string | null>(null);
  readonly status = computed(() => {
    const status = this.#loaded()?.status ?? 'unavailable';

    return status === 'pending' && this.invitationUrl() === null ? 'unlinked' : status;
  });
  readonly chatLabel = computed(() => this.#loaded()?.chatLabel ?? '');
  readonly linkedAt = computed(() => {
    const linkedAt = this.#loaded()?.linkedAt;

    return linkedAt ? this.#dateFormat.format(new Date(linkedAt)) : '';
  });
  readonly botUsername = computed(() => this.#invitation()?.bot ?? null);
  readonly startCommand = computed(() => {
    const invitation = this.#invitation();

    return invitation ? `/start ${invitation.token}` : null;
  });
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
    this.#scheduleCheck(expiresAt, this.#generation);
  }

  #scheduleCheck(expiresAt: number, generation: number): void {
    this.#timer = setTimeout(() => void this.#check(expiresAt, generation), POLL_INTERVAL_MS);
  }

  #stopPolling(): void {
    clearTimeout(this.#timer);
    this.#timer = undefined;
    this.#generation++;
  }

  async #check(expiresAt: number, generation: number): Promise<void> {
    try {
      const response = await firstValueFrom(this.#telegramApiClient.checkTelegramLink());

      if (this.#generation !== generation) {
        return;
      }

      if (response.status === 'linked') {
        this.#stopPolling();
        this.invitationUrl.set(null);
        this.#current.set(response);
      } else if (response.status === 'unlinked' && Date.now() >= expiresAt) {
        this.#stopPolling();
        this.invitationUrl.set(null);
        this.expired.set(true);
        this.#current.set(response);
      } else {
        this.#scheduleCheck(expiresAt, generation);
      }
    } catch {
      if (this.#generation !== generation) {
        return;
      }

      this.#stopPolling();
      this.invitationUrl.set(null);
      this.#failedAction.set(true);
    }
  }
}

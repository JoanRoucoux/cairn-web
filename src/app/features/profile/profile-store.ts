import { Injectable, LOCALE_ID, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { AmountVisibility } from '@core/amounts/amount-visibility';
import type { PasskeyResponse } from '@core/api-client/cairnAPI.schemas';
import { InstrumentService } from '@core/api-client/instrument/instrument.service';
import { LanguageStore } from '@core/i18n/language-store';
import { SessionStore } from '@core/session/session-store';
import { type ThemePreference, ThemeStore } from '@core/theme/theme-store';

import { parisDateString } from '@shared/format/paris-date';

const MILLISECONDS_PER_DAY = 86_400_000;

export type PasskeyUsage = { kind: 'never' | 'today' | 'yesterday' | 'on'; date: string };

export type PasskeyView = {
  credentialId: string;
  label: string;
  current: boolean;
  provider: string | null;
  created: string;
  usage: PasskeyUsage;
};

const parisDayNumber = (date: Date): number => {
  const [year, month, day] = parisDateString(date).split('-').map(Number) as [number, number, number];

  return Date.UTC(year, month - 1, day) / MILLISECONDS_PER_DAY;
};

@Injectable()
export class ProfileStore {
  #session = inject(SessionStore);
  #theme = inject(ThemeStore);
  #language = inject(LanguageStore);
  #amountVisibility = inject(AmountVisibility);
  #instrumentsApiClient = inject(InstrumentService);

  #dateFormat = new Intl.DateTimeFormat(inject(LOCALE_ID), {
    timeZone: 'Europe/Paris',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  readonly #instruments = rxResource({
    stream: () => this.#instrumentsApiClient.listInstruments(),
  });

  readonly state = this.#session.state;
  readonly owner = this.#session.owner;
  readonly username = this.#session.username;
  readonly signInMethod = this.#session.signInMethod;
  readonly theme = this.#theme.preference;
  readonly systemScheme = this.#theme.systemScheme;
  readonly language = this.#language.activeLang;
  readonly availableLanguages = this.#language.availableLangs;
  readonly hideAmounts = this.#amountVisibility.hidden;

  readonly instrumentCount = computed(() => (this.#instruments.hasValue() ? this.#instruments.value().length : null));

  readonly passkeys = computed<PasskeyView[]>(() => {
    const now = new Date();

    return this.#session.passkeys().map((passkey) => ({
      credentialId: passkey.credentialId,
      label: passkey.label,
      current: passkey.current,
      provider: passkey.provider ?? null,
      created: this.#dateFormat.format(new Date(passkey.createdAt)),
      usage: this.#usage(passkey, now),
    }));
  });

  setTheme(preference: ThemePreference): void {
    this.#theme.set(preference);
  }

  setLanguage(lang: string): void {
    this.#language.setActiveLang(lang);
  }

  setHideAmounts(value: boolean): void {
    this.#amountVisibility.setHidden(value);
  }

  async signOut(): Promise<void> {
    await this.#session.signOut();
  }

  reloadSession(): void {
    this.#session.reload();
  }

  #usage(passkey: PasskeyResponse, now: Date): PasskeyUsage {
    if (!passkey.lastUsedAt) {
      return { kind: 'never', date: '' };
    }

    const lastUsed = new Date(passkey.lastUsedAt);
    const days = parisDayNumber(now) - parisDayNumber(lastUsed);

    if (days === 0) {
      return { kind: 'today', date: '' };
    }

    return days === 1 ? { kind: 'yesterday', date: '' } : { kind: 'on', date: this.#dateFormat.format(lastUsed) };
  }
}

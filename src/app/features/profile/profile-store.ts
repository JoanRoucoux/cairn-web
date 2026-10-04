import { Injectable, LOCALE_ID, computed, effect, inject, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { type AsyncState } from '@joanroucoux/cairn-ui/async';

import { AmountVisibility } from '@core/amounts/amount-visibility';
import type { PasskeyResponse } from '@core/api-client/cairnAPI.schemas';
import { SessionService } from '@core/api-client/session/session.service';
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
  #sessionApiClient = inject(SessionService);

  #dateFormat = new Intl.DateTimeFormat(inject(LOCALE_ID), {
    timeZone: 'Europe/Paris',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  readonly #passkeys = rxResource({
    stream: () => this.#sessionApiClient.listPasskeys(),
  });

  readonly identityState = this.#session.state;
  readonly passkeysState = computed<AsyncState>(() => {
    if (this.#passkeys.error()) {
      return 'error';
    }

    return this.#passkeys.hasValue() ? 'ready' : 'loading';
  });
  readonly owner = this.#session.owner;
  readonly username = this.#session.username;
  readonly signInMethod = this.#session.signInMethod;
  readonly theme = this.#theme.preference;
  readonly systemScheme = this.#theme.systemScheme;
  readonly language = this.#language.activeLang;
  readonly availableLanguages = this.#language.availableLangs;
  readonly hideAmounts = this.#amountVisibility.hidden;

  readonly passkeys = computed<PasskeyView[]>(() => {
    const now = new Date();

    return (this.#passkeys.hasValue() ? this.#passkeys.value() : []).map((passkey) => ({
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

  readonly #knownBeforeAdd = signal<ReadonlySet<string> | null>(null);
  readonly #addedBefore = signal<ReadonlySet<string>>(new Set());

  readonly addedPasskeyIds = computed<ReadonlySet<string>>(() => {
    const known = this.#knownBeforeAdd();
    const fresh = known
      ? this.passkeys()
          .map((passkey) => passkey.credentialId)
          .filter((id) => !known.has(id))
      : [];

    return new Set([...this.#addedBefore(), ...fresh]);
  });

  constructor() {
    effect(() => {
      if (this.#passkeys.status() === 'error') {
        untracked(() => {
          this.#addedBefore.set(new Set());
          this.#knownBeforeAdd.set(null);
        });
      }
    });
  }

  reloadPasskeys(): void {
    this.#passkeys.reload();
  }

  passkeyAdded(): void {
    this.#addedBefore.set(this.addedPasskeyIds());
    this.#knownBeforeAdd.set(
      this.#passkeys.hasValue() ? new Set(this.passkeys().map((passkey) => passkey.credentialId)) : null,
    );
    this.#passkeys.reload();
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

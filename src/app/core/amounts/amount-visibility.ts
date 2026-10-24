import { Injectable, type Provider, type Signal, computed, inject, signal } from '@angular/core';

import { UI_AMOUNT_LABELS, UI_AMOUNT_MASKED } from '@joanroucoux/cairn-ui/amount';
import { translateSignal } from '@jsverse/transloco';

const STORAGE_KEY = 'cairn-hide-amounts';

const readStoredHidden = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

@Injectable({ providedIn: 'root' })
export class AmountVisibility {
  readonly #hidden = signal(readStoredHidden());

  readonly hidden: Signal<boolean> = this.#hidden.asReadonly();

  toggle(): void {
    this.setHidden(!this.#hidden());
  }

  setHidden(value: boolean): void {
    this.#hidden.set(value);
    try {
      localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    } catch {
      return;
    }
  }
}

export function provideAmountVisibility(): Provider[] {
  return [
    { provide: UI_AMOUNT_MASKED, useFactory: () => inject(AmountVisibility).hidden },
    {
      provide: UI_AMOUNT_LABELS,
      useFactory: () => {
        const masked = translateSignal('amount.masked');
        const missing = translateSignal('amount.missing');
        return computed(() => ({ masked: masked(), missing: missing() }));
      },
    },
  ];
}

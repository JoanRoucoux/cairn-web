import { Injectable, type Provider, type Signal, inject, signal } from '@angular/core';

import { UI_AMOUNT_MASKED } from '@joanroucoux/cairn-ui';

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

  setHidden(value: boolean): void {
    this.#hidden.set(value);
    try {
      localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    } catch {
      return;
    }
  }
}

export function provideAmountVisibility(): Provider {
  return { provide: UI_AMOUNT_MASKED, useFactory: () => inject(AmountVisibility).hidden };
}

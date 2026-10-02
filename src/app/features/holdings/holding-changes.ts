import { Injectable, signal } from '@angular/core';

export type HoldingChange = { id: string; at: number };

@Injectable()
export class HoldingChanges {
  readonly #lastTouched = signal<HoldingChange | null>(null);
  readonly #lastRemoved = signal<HoldingChange | null>(null);
  readonly #lastRevealed = signal<HoldingChange | null>(null);

  readonly lastTouched = this.#lastTouched.asReadonly();
  readonly lastRemoved = this.#lastRemoved.asReadonly();
  readonly lastRevealed = this.#lastRevealed.asReadonly();

  touched(id: string): HoldingChange {
    const change = { id, at: Date.now() };

    this.#lastTouched.set(change);

    return change;
  }

  removed(id: string): void {
    this.#lastRemoved.set({ id, at: Date.now() });
  }

  reveal(change: HoldingChange): void {
    this.#lastRevealed.set(change);
  }
}

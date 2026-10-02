import { Injectable, signal } from '@angular/core';

export type HoldingChange = { id: string; at: number };

@Injectable()
export class HoldingChanges {
  readonly #lastTouched = signal<HoldingChange | null>(null);
  readonly #lastRemoved = signal<HoldingChange | null>(null);

  readonly lastTouched = this.#lastTouched.asReadonly();
  readonly lastRemoved = this.#lastRemoved.asReadonly();

  touched(id: string): void {
    this.#lastTouched.set({ id, at: Date.now() });
  }

  removed(id: string): void {
    this.#lastRemoved.set({ id, at: Date.now() });
  }
}

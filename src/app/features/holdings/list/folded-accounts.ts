import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'cairn-folded-accounts';

const readStored = (): string[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');

    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

@Injectable()
export class FoldedAccounts {
  readonly #ids = signal<ReadonlySet<string>>(new Set(readStored()));

  isFolded(accountId: string): boolean {
    return this.#ids().has(accountId);
  }

  setFolded(accountId: string, folded: boolean): void {
    if (this.isFolded(accountId) === folded) {
      return;
    }

    const ids = new Set(this.#ids());

    if (folded) {
      ids.add(accountId);
    } else {
      ids.delete(accountId);
    }

    this.#write(ids);
  }

  prune(knownAccountIds: readonly string[]): void {
    const known = new Set(knownAccountIds);
    const kept = [...this.#ids()].filter((id) => known.has(id));

    if (kept.length !== this.#ids().size) {
      this.#write(new Set(kept));
    }
  }

  #write(ids: ReadonlySet<string>): void {
    this.#ids.set(ids);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
    } catch {
      return;
    }
  }
}

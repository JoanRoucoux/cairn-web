import { DestroyRef, type Signal, inject, signal } from '@angular/core';

const DESKTOP_QUERY = '(min-width: 1024px)';

export const injectDesktop = (): Signal<boolean> => {
  const desktop = signal(false);
  const query = globalThis.matchMedia?.(DESKTOP_QUERY);

  if (query) {
    const update = (): void => desktop.set(query.matches);

    update();
    query.addEventListener('change', update);
    inject(DestroyRef).onDestroy(() => query.removeEventListener('change', update));
  }

  return desktop.asReadonly();
};

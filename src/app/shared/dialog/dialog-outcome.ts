import { DestroyRef, type Signal, inject, signal } from '@angular/core';

export type DialogOutcome<T> = {
  readonly open: Signal<boolean>;
  dismiss(): void;
  succeed(value: T): void;
  settle(): { value: T } | null;
};

export const injectDialogOutcome = <T>(reveal: (value: T) => void): DialogOutcome<T> => {
  const open = signal(true);
  let result: { value: T } | null = null;
  let revealed = false;
  const show = (): void => {
    if (result && !revealed) {
      revealed = true;
      reveal(result.value);
    }
  };

  inject(DestroyRef).onDestroy(show);

  return {
    open: open.asReadonly(),
    dismiss: () => open.set(false),
    succeed: (value) => {
      result = { value };
      open.set(false);
    },
    settle: () => {
      show();

      return result;
    },
  };
};

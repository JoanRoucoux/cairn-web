import { Injector, type Signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { TranslocoService } from '@jsverse/transloco';
import { map } from 'rxjs';

/**
 * The text a refused field shows, one entry per validator this application uses.
 *
 * Signals, not strings: a validator's `message` callback reads them while the error is computed,
 * so a message already on screen is retranslated when the reader switches language.
 */
export type FormMessages = {
  required: Signal<string>;
  maxLength: (limit: number) => Signal<string>;
  min: (floor: number) => Signal<string>;
};

/** Builds the messages. Call it from an injection context: toSignal needs one. */
export const formMessages = (): FormMessages => {
  const service = inject(TranslocoService);
  const injector = inject(Injector);

  // translateSignal resolves keys against the ambient Transloco scope, which would turn this root-scope key into a scoped one.
  const translate = (key: string, params?: Record<string, unknown>): Signal<string> => {
    const translated = (): string => service.translate<string>(key, params);
    return toSignal(service.langChanges$.pipe(map(translated)), { initialValue: translated(), injector });
  };

  return {
    required: translate('forms.required'),
    maxLength: (limit) => translate('forms.maxLength', { limit }),
    min: (floor) => translate('forms.min', { floor }),
  };
};

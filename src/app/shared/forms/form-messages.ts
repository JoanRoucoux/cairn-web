import { Injector, type Signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { TranslocoService } from '@jsverse/transloco';
import { map } from 'rxjs';

export type FormMessages = {
  required: Signal<string>;
  maxLength: (limit: number) => Signal<string>;
  min: (floor: number) => Signal<string>;
  positive: Signal<string>;
  decimal: Signal<string>;
};

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
    positive: translate('forms.positive'),
    decimal: translate('forms.decimal'),
  };
};

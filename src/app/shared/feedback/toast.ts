import { inject } from '@angular/core';

import { UiToasts } from '@joanroucoux/cairn-ui/toast';
import { TRANSLOCO_SCOPE, TranslocoService } from '@jsverse/transloco';
import { type Observable, catchError, of, take } from 'rxjs';

export type ShowToast = (key: string, params?: Record<string, unknown>) => void;

const injectTranslated = (show: (text: string, transloco: TranslocoService) => void): ShowToast => {
  const transloco = inject(TranslocoService);
  const scopes = [inject(TRANSLOCO_SCOPE, { optional: true }) ?? []]
    .flat()
    .filter((scope): scope is string => typeof scope === 'string');

  return (key, params) => {
    const scope = scopes.find((name) => key.startsWith(`${name}.`));
    const loaded: Observable<unknown> = scope ? transloco.load(`${scope}/${transloco.getActiveLang()}`) : of(null);

    loaded
      .pipe(
        catchError(() => of(null)),
        take(1),
      )
      .subscribe(() => show(transloco.translate(key, params), transloco));
  };
};

export const injectToast = (): ShowToast => {
  const toasts = inject(UiToasts);

  return injectTranslated((text) => toasts.show(text));
};

export const injectErrorToast = (): ShowToast => {
  const toasts = inject(UiToasts);

  return injectTranslated((text, transloco) => toasts.showError(text, transloco.translate('dialog.close')));
};

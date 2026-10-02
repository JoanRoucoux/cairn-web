import { inject } from '@angular/core';

import { UiToasts } from '@joanroucoux/cairn-ui';
import { TranslocoService } from '@jsverse/transloco';

export const injectToast = (): ((key: string, params?: Record<string, unknown>) => void) => {
  const toasts = inject(UiToasts);
  const transloco = inject(TranslocoService);

  return (key, params) => toasts.show(transloco.translate(key, params));
};

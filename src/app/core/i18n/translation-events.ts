import { type Signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { type TranslocoEvents, TranslocoService } from '@jsverse/transloco';
import { asapScheduler, observeOn } from 'rxjs';

export const injectTranslationEvents = (): Signal<TranslocoEvents | null> =>
  toSignal(inject(TranslocoService).events$.pipe(observeOn(asapScheduler)), { initialValue: null });

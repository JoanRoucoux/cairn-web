import { Component, computed, input, output } from '@angular/core';

import { UiAmount } from '@joanroucoux/cairn-ui/amount';
import { UiRow } from '@joanroucoux/cairn-ui/row';
import { TranslocoPipe } from '@jsverse/transloco';

import type { InstrumentCandidateResponse } from '@core/api-client/cairnAPI.schemas';

import { ShortDatePipe } from '@shared/format/short-date-pipe';

import { joinIdentifiers } from '../../identifiers';
import { isForeign } from '../../result-groups';

@Component({
  selector: 'app-holding-add-candidate',
  imports: [ShortDatePipe, TranslocoPipe, UiAmount, UiRow],
  templateUrl: './holding-add-candidate.html',
  host: { class: 'contents' },
})
export class HoldingAddCandidate {
  readonly candidate = input.required<InstrumentCandidateResponse>();

  readonly picked = output<InstrumentCandidateResponse>();

  protected readonly foreign = computed(() => isForeign(this.candidate()));

  protected readonly identifiers = computed(() => {
    const { exchange, isin, source, sourceRef, symbol } = this.candidate();

    if (this.foreign()) {
      return joinIdentifiers(exchange, symbol ?? sourceRef);
    }

    switch (source) {
      case 'COINGECKO':
        return joinIdentifiers(symbol, sourceRef);
      case 'AMUNDI':
        return isin ?? sourceRef;
      default:
        return joinIdentifiers(isin, exchange, symbol ?? sourceRef);
    }
  });

  protected readonly navDate = computed(() => {
    const { probeAsOf, source } = this.candidate();

    return source === 'AMUNDI' ? (probeAsOf ?? null) : null;
  });
}

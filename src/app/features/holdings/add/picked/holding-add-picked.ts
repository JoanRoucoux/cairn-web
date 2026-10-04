import { Component, computed, input, output } from '@angular/core';

import { UiAmount } from '@joanroucoux/cairn-ui/amount';
import { UiBadge } from '@joanroucoux/cairn-ui/badge';
import { UiButton } from '@joanroucoux/cairn-ui/button';
import { UiCard } from '@joanroucoux/cairn-ui/card';
import { TranslocoPipe } from '@jsverse/transloco';

import { ShortDatePipe } from '@shared/format/short-date-pipe';

import type { PickedTitle } from '../holding-add-dialog-store';
import { joinIdentifiers } from '../identifiers';

@Component({
  selector: 'app-holding-add-picked',
  imports: [ShortDatePipe, TranslocoPipe, UiAmount, UiBadge, UiButton, UiCard],
  templateUrl: './holding-add-picked.html',
})
export class HoldingAddPicked {
  readonly title = input.required<PickedTitle>();

  readonly changed = output<void>();

  protected readonly view = computed(() => {
    const picked = this.title();

    if (picked.kind === 'tracked') {
      const { assetClass, instrumentName, isin, priceSource, symbol } = picked.title;

      return {
        name: instrumentName,
        isNew: false,
        identifiers: isin ?? symbol ?? '',
        assetClass,
        source: priceSource,
        natureKey: 'holdings.add.sourceLine.tracked',
        asOf: null,
        trialPrice: null,
      };
    }

    const { exchange, isin, name, probeAsOf, probePrice, source, sourceRef, symbol } = picked.candidate;
    const identifiers =
      source === 'COINGECKO'
        ? (symbol ?? sourceRef)
        : source === 'AMUNDI'
          ? (isin ?? sourceRef)
          : joinIdentifiers(isin, exchange, symbol ?? sourceRef);
    const dated = source === 'AMUNDI' && !!probeAsOf;

    return {
      name,
      isNew: true,
      identifiers,
      assetClass: null,
      source,
      natureKey: `holdings.add.sourceLine.${dated ? 'AMUNDI_ON' : source}`,
      asOf: dated ? probeAsOf : null,
      trialPrice: probePrice ?? null,
    };
  });
}

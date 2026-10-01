import { Component, LOCALE_ID, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UI_AMOUNT_MASKED, UiAmount, UiCard, UiDelta, UiRow, formatAmount } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { decimalPlaces } from '@shared/format/decimal-places';
import { RatioPipe } from '@shared/format/ratio-pipe';
import { ShortDatePipe } from '@shared/format/short-date-pipe';

import { isMissing } from '../../../is-missing';
import { type AccountGroup, isBooklet } from '../../holding-list-store';
import { filteredCount, groupCount } from '../group-count';

@Component({
  selector: 'app-holding-account-card',
  imports: [RatioPipe, RouterLink, ShortDatePipe, TranslocoPipe, UiAmount, UiCard, UiDelta, UiRow],
  templateUrl: './holding-account-card.html',
  host: {
    class: 'flex flex-col gap-2',
    'data-testid': 'account-card',
    '[attr.data-account-id]': 'group().accountId',
  },
})
export class HoldingAccountCard {
  readonly group = input.required<AccountGroup>();

  readonly editCash = output<string>();

  readonly #locale = inject(LOCALE_ID);
  readonly #masked = inject(UI_AMOUNT_MASKED);

  protected readonly accountTotal = computed(() =>
    formatAmount(this.group().filtered?.accountValueEur, { locale: this.#locale, currency: 'EUR' }, this.#masked()),
  );
  protected readonly decimalPlaces = decimalPlaces;
  protected readonly filteredCount = filteredCount;
  protected readonly groupCount = groupCount;
  protected readonly isBooklet = isBooklet;
  protected readonly unpriced = (holding: HoldingResponse): boolean => isMissing(holding.price);
}

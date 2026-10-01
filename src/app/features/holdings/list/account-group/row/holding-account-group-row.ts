import { Component, booleanAttribute, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiAmount, UiCellSub, UiRowLink, UiTd } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { decimalPlaces } from '@shared/format/decimal-places';
import { RatioPipe } from '@shared/format/ratio-pipe';
import { ShortDatePipe } from '@shared/format/short-date-pipe';

import { isBooklet } from '../../holding-list-store';
import { deltaTone, isMissing } from '../delta-tone';

@Component({
  selector: 'tr[app-holding-account-group-row]',
  imports: [RatioPipe, RouterLink, ShortDatePipe, TranslocoPipe, UiAmount, UiCellSub, UiRowLink, UiTd],
  templateUrl: './holding-account-group-row.html',
  host: { 'data-testid': 'holding-row' },
})
export class HoldingAccountGroupRow {
  readonly holding = input.required<HoldingResponse>();
  readonly compact = input(false, { transform: booleanAttribute });
  readonly open = input(false, { transform: booleanAttribute });

  protected readonly decimalPlaces = decimalPlaces;
  protected readonly deltaTone = deltaTone;
  protected readonly booklet = computed(() => isBooklet(this.holding()));
  protected readonly unpriced = computed(() => isMissing(this.holding().price));
  protected readonly unknownDay = computed(() => isMissing(this.holding().dayChangeRatio));
  protected readonly hasGainRatio = computed(() => !isMissing(this.holding().unrealizedGainRatio));
}

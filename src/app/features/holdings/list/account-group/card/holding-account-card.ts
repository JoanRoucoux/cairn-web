import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiAmount, UiCard, UiRow } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import { decimalPlaces } from '@shared/format/decimal-places';
import { RatioPipe } from '@shared/format/ratio-pipe';

import { type AccountGroup, isBooklet } from '../../holding-list-store';
import { deltaTone } from '../delta-tone';
import { groupCount } from '../group-count';

@Component({
  selector: 'app-holding-account-card',
  imports: [RatioPipe, RouterLink, TranslocoPipe, UiAmount, UiCard, UiRow],
  templateUrl: './holding-account-card.html',
  host: { class: 'flex flex-col gap-2', 'data-testid': 'account-card' },
})
export class HoldingAccountCard {
  readonly group = input.required<AccountGroup>();

  readonly editCash = output<string>();

  protected readonly decimalPlaces = decimalPlaces;
  protected readonly deltaTone = deltaTone;
  protected readonly groupCount = groupCount;
  protected readonly isBooklet = isBooklet;
}

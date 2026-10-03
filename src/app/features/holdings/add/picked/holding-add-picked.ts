import { Component, input, output } from '@angular/core';

import { UiAmount } from '@joanroucoux/cairn-ui/amount';
import { UiBadge } from '@joanroucoux/cairn-ui/badge';
import { UiButton } from '@joanroucoux/cairn-ui/button';
import { UiCard } from '@joanroucoux/cairn-ui/card';
import { UiField } from '@joanroucoux/cairn-ui/field';
import { UiInput } from '@joanroucoux/cairn-ui/input';
import { TranslocoPipe } from '@jsverse/transloco';

import type { AssetClass } from '@core/api-client/cairnAPI.schemas';

@Component({
  selector: 'app-holding-add-picked',
  imports: [TranslocoPipe, UiAmount, UiBadge, UiButton, UiCard, UiField, UiInput],
  templateUrl: './holding-add-picked.html',
  host: { class: 'flex flex-col gap-4' },
})
export class HoldingAddPicked {
  readonly name = input.required<string>();
  readonly sub = input.required<string>();
  readonly isNew = input.required<boolean>();
  readonly manual = input.required<boolean>();
  readonly assetClasses = input.required<AssetClass[]>();
  readonly assetClass = input.required<AssetClass | undefined>();
  readonly quantityText = input.required<string>();
  readonly averageCostText = input.required<string>();
  readonly valueAtProbe = input.required<number | null>();
  readonly gainAtProbe = input.required<number | null>();
  readonly trialPrice = input.required<number | null>();
  readonly sourceLabel = input.required<string>();

  readonly changed = output<void>();
  readonly assetClassInput = output<Event>();
  readonly quantityInput = output<Event>();
  readonly averageCostInput = output<Event>();
}

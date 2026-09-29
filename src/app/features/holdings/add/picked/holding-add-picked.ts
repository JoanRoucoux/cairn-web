import { Component, input, output } from '@angular/core';

import { UiAmount, UiBadge, UiButton, UiField, UiInput } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import type { AssetClass } from '@core/api-client/cairnAPI.schemas';

@Component({
  selector: 'app-holding-add-picked',
  imports: [TranslocoPipe, UiAmount, UiBadge, UiButton, UiField, UiInput],
  templateUrl: './holding-add-picked.html',
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

  readonly changed = output<void>();
  readonly assetClassInput = output<Event>();
  readonly quantityInput = output<Event>();
  readonly averageCostInput = output<Event>();
}

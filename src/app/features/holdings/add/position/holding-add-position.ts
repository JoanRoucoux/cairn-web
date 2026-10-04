import { Component, input, output } from '@angular/core';

import { UiAmount } from '@joanroucoux/cairn-ui/amount';
import { UiField } from '@joanroucoux/cairn-ui/field';
import { UiInput } from '@joanroucoux/cairn-ui/input';
import { UiSelect } from '@joanroucoux/cairn-ui/select';
import { TranslocoPipe } from '@jsverse/transloco';

export type AccountOption = { id: string; label: string };

@Component({
  selector: 'app-holding-add-position',
  imports: [TranslocoPipe, UiAmount, UiField, UiInput, UiSelect],
  templateUrl: './holding-add-position.html',
})
export class HoldingAddPosition {
  readonly accountOptions = input.required<AccountOption[]>();
  readonly accountId = input.required<string>();
  readonly quantityText = input.required<string>();
  readonly averageCostText = input.required<string>();
  readonly value = input.required<number | null>();
  readonly manual = input.required<boolean>();

  readonly accountChange = output<Event>();
  readonly quantityInput = output<Event>();
  readonly averageCostInput = output<Event>();
}

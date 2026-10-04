import { Component, input, output } from '@angular/core';

import { UiBackLink } from '@joanroucoux/cairn-ui/back-link';
import { UiField } from '@joanroucoux/cairn-ui/field';
import { UiInput } from '@joanroucoux/cairn-ui/input';
import { UiSelect } from '@joanroucoux/cairn-ui/select';
import { TranslocoPipe } from '@jsverse/transloco';

import type { AssetClass } from '@core/api-client/cairnAPI.schemas';

const MANUAL_CLASSES: readonly AssetClass[] = ['EQUITY', 'ETF', 'FUND', 'CRYPTO', 'BOND', 'OTHER'];

@Component({
  selector: 'app-holding-add-manual',
  imports: [TranslocoPipe, UiBackLink, UiField, UiInput, UiSelect],
  templateUrl: './holding-add-manual.html',
  host: { class: 'flex flex-col gap-4' },
})
export class HoldingAddManual {
  readonly name = input.required<string>();
  readonly assetClass = input.required<AssetClass>();
  readonly priceText = input.required<string>();

  readonly nameInput = output<Event>();
  readonly assetClassChange = output<Event>();
  readonly priceInput = output<Event>();
  readonly back = output<void>();

  protected readonly classes = MANUAL_CLASSES;
}

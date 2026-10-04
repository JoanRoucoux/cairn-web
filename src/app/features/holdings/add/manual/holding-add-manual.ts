import { Component, input, output } from '@angular/core';

import { UiButton } from '@joanroucoux/cairn-ui/button';
import { UiField } from '@joanroucoux/cairn-ui/field';
import { UiInput } from '@joanroucoux/cairn-ui/input';
import { UiSelect } from '@joanroucoux/cairn-ui/select';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideChevronLeft } from '@lucide/angular';

import type { AssetClass } from '@core/api-client/cairnAPI.schemas';

const MANUAL_CLASSES: readonly AssetClass[] = ['EQUITY', 'ETF', 'FUND', 'CRYPTO', 'BOND', 'OTHER'];

@Component({
  selector: 'app-holding-add-manual',
  imports: [LucideChevronLeft, TranslocoPipe, UiButton, UiField, UiInput, UiSelect],
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

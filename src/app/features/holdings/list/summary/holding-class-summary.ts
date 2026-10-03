import { Component, computed, input } from '@angular/core';

import { UiAmount } from '@joanroucoux/cairn-ui/amount';
import { TranslocoPipe } from '@jsverse/transloco';

import type { AssetClass } from '@core/api-client/cairnAPI.schemas';

import { RatioPipe } from '@shared/format/ratio-pipe';

import type { ClassSummary } from '../holding-list-store';

@Component({
  selector: 'app-holding-class-summary',
  imports: [RatioPipe, TranslocoPipe, UiAmount],
  templateUrl: './holding-class-summary.html',
  host: { class: 'text-label m-0 block text-(--muted-foreground) tabular-nums text-pretty max-lg:px-1' },
})
export class HoldingClassSummary {
  readonly assetClass = input.required<AssetClass>();
  readonly summary = input.required<ClassSummary>();

  protected readonly shareKey = computed(
    () => `holdings.classSummary.share_${this.summary().accounts > 1 ? 'other' : 'one'}`,
  );
}

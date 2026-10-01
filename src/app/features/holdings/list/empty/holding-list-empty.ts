import { Component, input } from '@angular/core';

import { TranslocoPipe } from '@jsverse/transloco';

import type { AssetClass } from '@core/api-client/cairnAPI.schemas';

@Component({
  selector: 'app-holding-list-empty',
  imports: [TranslocoPipe],
  templateUrl: './holding-list-empty.html',
  host: { class: 'flex flex-col gap-1.5 px-2 py-8 text-center md:py-12', role: 'status' },
})
export class HoldingListEmpty {
  readonly search = input.required<string>();
  readonly assetClass = input.required<AssetClass | null>();
}

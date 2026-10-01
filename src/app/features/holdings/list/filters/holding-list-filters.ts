import { Component, booleanAttribute, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TranslocoPipe } from '@jsverse/transloco';
import { LucideX } from '@lucide/angular';

import type { AssetClass } from '@core/api-client/cairnAPI.schemas';

@Component({
  selector: 'app-holding-list-filters',
  imports: [LucideX, RouterLink, TranslocoPipe],
  templateUrl: './holding-list-filters.html',
})
export class HoldingListFilters {
  readonly stale = input(false, { transform: booleanAttribute });
  readonly account = input<string | null>(null);
  readonly assetClass = input<AssetClass | null>(null);
}

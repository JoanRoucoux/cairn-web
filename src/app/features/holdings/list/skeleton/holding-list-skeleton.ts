import { Component } from '@angular/core';

import { UiCard, UiSkeleton } from '@joanroucoux/cairn-ui';

@Component({
  selector: 'app-holding-list-skeleton',
  imports: [UiCard, UiSkeleton],
  templateUrl: './holding-list-skeleton.html',
  host: { 'data-testid': 'holdings-loading' },
})
export class HoldingListSkeleton {
  protected readonly cards = [1, 2];
  protected readonly cardRows = [1, 2, 3, 4];
  protected readonly nameWidths = [220, 180, 260, 200, 240, 170, 210, 190];
}

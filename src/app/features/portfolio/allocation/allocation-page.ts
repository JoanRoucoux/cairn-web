import { Component, inject } from '@angular/core';

import { UiCard, UiSkeleton } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import { AllocationBreakdown } from './allocation-breakdown';
import { AllocationStore } from './allocation-store';

@Component({
  selector: 'app-allocation-page',
  imports: [AllocationBreakdown, TranslocoPipe, UiCard, UiSkeleton],
  templateUrl: './allocation-page.html',
  providers: [AllocationStore],
})
export class AllocationPage {
  #store = inject(AllocationStore);

  protected readonly portfolio = this.#store.portfolio;
}

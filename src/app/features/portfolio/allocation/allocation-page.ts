import { Component, inject } from '@angular/core';

import { TranslocoPipe } from '@jsverse/transloco';
import { UiCard, UiSkeleton } from 'cairn-ui';

import { AllocationBreakdown } from './allocation-breakdown';
import { AllocationStore } from './allocation-store';

@Component({
  selector: 'app-allocation-page',
  imports: [AllocationBreakdown, TranslocoPipe, UiCard, UiSkeleton],
  templateUrl: './allocation-page.html',
})
export class AllocationPage {
  #store = inject(AllocationStore);

  protected readonly portfolio = this.#store.portfolio;
}

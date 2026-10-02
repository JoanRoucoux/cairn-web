import { Component, booleanAttribute, computed, input, output } from '@angular/core';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { HoldingAddDialog } from '../../add/holding-add-dialog';
import { listingQueryOf } from '../../foreign-currency';
import { ManualQuoteDialog } from '../../manual-quote/manual-quote-dialog';
import { HoldingBuyDialog } from '../buy-dialog/holding-buy-dialog';
import { HoldingDeleteDialog } from '../delete-dialog/holding-delete-dialog';
import { HoldingEditDialog } from '../edit-dialog/holding-edit-dialog';
import { HoldingSellDialog } from '../sell-dialog/holding-sell-dialog';
import type { SellResult } from '../sell-dialog/holding-sell-dialog-store';

@Component({
  selector: 'app-holding-detail-dialogs',
  imports: [
    HoldingAddDialog,
    HoldingBuyDialog,
    HoldingDeleteDialog,
    HoldingEditDialog,
    HoldingSellDialog,
    ManualQuoteDialog,
  ],
  templateUrl: './holding-detail-dialogs.html',
})
export class HoldingDetailDialogs {
  readonly holding = input.required<HoldingResponse>();

  protected readonly listingQuery = computed(() => listingQueryOf(this.holding()));
  readonly pricingInstrument = input<{ id: string; name: string }>();
  readonly buyOpen = input(false, { transform: booleanAttribute });
  readonly sellOpen = input(false, { transform: booleanAttribute });
  readonly editOpen = input(false, { transform: booleanAttribute });
  readonly deleteOpen = input(false, { transform: booleanAttribute });
  readonly listingOpen = input(false, { transform: booleanAttribute });

  readonly quoteSaved = output<void>();
  readonly quoteDismissed = output<void>();
  readonly bought = output<HoldingResponse>();
  readonly buyDismissed = output<void>();
  readonly sold = output<SellResult>();
  readonly sellDismissed = output<void>();
  readonly edited = output<HoldingResponse>();
  readonly editDismissed = output<void>();
  readonly deleted = output<string>();
  readonly deleteDismissed = output<void>();
  readonly listingChanged = output<void>();
  readonly listingDismissed = output<void>();
}

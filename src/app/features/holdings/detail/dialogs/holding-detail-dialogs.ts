import { Component, booleanAttribute, input, output } from '@angular/core';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { HoldingBuyDialog } from '../buy-dialog/holding-buy-dialog';
import { HoldingDeleteDialog } from '../delete-dialog/holding-delete-dialog';
import { HoldingEditDialog } from '../edit-dialog/holding-edit-dialog';
import { ManualQuoteDialog } from '../manual-quote/manual-quote-dialog';
import { HoldingSellDialog } from '../sell-dialog/holding-sell-dialog';

@Component({
  selector: 'app-holding-detail-dialogs',
  imports: [HoldingBuyDialog, HoldingDeleteDialog, HoldingEditDialog, HoldingSellDialog, ManualQuoteDialog],
  templateUrl: './holding-detail-dialogs.html',
})
export class HoldingDetailDialogs {
  readonly holding = input.required<HoldingResponse>();
  readonly pricingInstrument = input<{ id: string; name: string }>();
  readonly buyOpen = input(false, { transform: booleanAttribute });
  readonly sellOpen = input(false, { transform: booleanAttribute });
  readonly editOpen = input(false, { transform: booleanAttribute });
  readonly deleteOpen = input(false, { transform: booleanAttribute });

  readonly quoteSaved = output<void>();
  readonly quoteDismissed = output<void>();
  readonly bought = output<void>();
  readonly buyDismissed = output<void>();
  readonly sold = output<boolean>();
  readonly sellDismissed = output<void>();
  readonly edited = output<void>();
  readonly editDismissed = output<void>();
  readonly deleted = output<void>();
  readonly deleteDismissed = output<void>();
}

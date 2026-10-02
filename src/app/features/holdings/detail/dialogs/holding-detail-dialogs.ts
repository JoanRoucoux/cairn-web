import { Component, type Signal, booleanAttribute, input, linkedSignal, output } from '@angular/core';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { ManualQuoteDialog } from '../../manual-quote/manual-quote-dialog';
import { HoldingBuyDialog } from '../buy-dialog/holding-buy-dialog';
import { HoldingDeleteDialog } from '../delete-dialog/holding-delete-dialog';
import { HoldingEditDialog } from '../edit-dialog/holding-edit-dialog';
import { HoldingSellDialog } from '../sell-dialog/holding-sell-dialog';
import type { SellResult } from '../sell-dialog/holding-sell-dialog-store';

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

  protected readonly buyHolding = this.#heldWhile(this.buyOpen);
  protected readonly sellHolding = this.#heldWhile(this.sellOpen);
  protected readonly editHolding = this.#heldWhile(this.editOpen);
  protected readonly deleteHolding = this.#heldWhile(this.deleteOpen);

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

  #heldWhile(open: Signal<boolean>): Signal<HoldingResponse> {
    return linkedSignal<{ open: boolean; holding: HoldingResponse }, HoldingResponse>({
      source: () => ({ open: open(), holding: this.holding() }),
      computation: (source, previous) => (source.open && previous ? previous.value : source.holding),
    });
  }
}

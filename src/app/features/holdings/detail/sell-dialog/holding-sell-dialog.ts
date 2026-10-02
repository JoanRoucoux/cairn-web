import { Component, ElementRef, LOCALE_ID, afterRenderEffect, computed, inject, input, output } from '@angular/core';

import {
  UiAlert,
  UiAmount,
  UiButton,
  UiCard,
  UiDelta,
  UiDialog,
  UiFact,
  UiFacts,
  UiField,
  UiInput,
  formatAmount,
} from '@joanroucoux/cairn-ui';
import { TranslocoPipe, translateSignal } from '@jsverse/transloco';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { injectDialogOutcome } from '@shared/dialog/dialog-outcome';
import { focusInitial } from '@shared/dialog/focus-initial';
import { injectToast } from '@shared/feedback/toast';
import { decimalPlaces } from '@shared/format/decimal-places';
import { filterDecimalInput } from '@shared/format/parse-decimal';
import { pluralKey } from '@shared/format/plural-key';

import { type HoldingChange, HoldingChanges } from '../../holding-changes';
import { sellPreview } from '../trade-preview';
import { HoldingSellDialogStore, type SellResult } from './holding-sell-dialog-store';

@Component({
  selector: 'app-holding-sell-dialog',
  imports: [TranslocoPipe, UiAlert, UiAmount, UiButton, UiCard, UiDelta, UiDialog, UiFact, UiFacts, UiField, UiInput],
  templateUrl: './holding-sell-dialog.html',
  providers: [HoldingSellDialogStore],
})
export class HoldingSellDialog {
  #store = inject(HoldingSellDialogStore);
  #locale = inject(LOCALE_ID);

  readonly holding = input.required<HoldingResponse>();
  readonly sold = output<SellResult>();
  readonly dismissed = output<void>();

  #toast = injectToast();
  #changes = inject(HoldingChanges);
  readonly #outcome = injectDialogOutcome<{ result: SellResult; change: HoldingChange | null }>(({ change }) => {
    if (change) {
      this.#toast('holdings.toasts.sold');
      this.#changes.reveal(change);
    } else {
      this.#toast('holdings.toasts.deleted');
    }
  });

  protected readonly open = this.#outcome.open;
  protected readonly quantityText = this.#store.quantityText;
  protected readonly submitting = this.#store.submitting;
  protected readonly error = this.#store.error;

  protected readonly fmtQty = (value: number): string =>
    formatAmount(value, { locale: this.#locale, fractionDigits: decimalPlaces(this.holding().quantity) });

  protected readonly over = computed(() => {
    const quantity = this.#store.quantity();

    return quantity !== null && quantity > this.holding().quantity;
  });

  protected readonly valid = computed(() => this.#store.valid(this.holding().quantity));

  protected readonly preview = computed(() => {
    const quantity = this.#store.quantity();
    const holding = this.holding();

    return this.valid() && quantity !== null
      ? sellPreview(holding.quantity, holding.averageCost ?? null, holding.price ?? null, quantity)
      : null;
  });

  protected readonly closes = computed(() => this.preview()?.closesHolding === true);

  readonly #heldParams = computed(() => ({ count: this.holding().quantity }));

  protected readonly held = translateSignal(
    computed(() => pluralKey('sell.held', this.holding().quantity)),
    this.#heldParams,
  );

  protected readonly overHint = translateSignal(
    computed(() => pluralKey('sell.over', this.holding().quantity)),
    this.#heldParams,
  );

  readonly #ctaQuantity = computed(() => (this.valid() ? this.#store.quantity() : null));

  protected readonly cta = translateSignal(
    computed(() => {
      const quantity = this.#ctaQuantity();

      if (quantity === null) {
        return 'sell.submitDefault';
      }

      return this.closes() ? 'sell.submitCloses' : pluralKey('sell.submit', quantity);
    }),
    computed(() => ({ count: this.#ctaQuantity() ?? 0 })),
  );

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterRenderEffect(() => {
      if (this.open() && this.#host.nativeElement.querySelector('dialog')?.open) {
        focusInitial(this.#host.nativeElement, 'holding-sell-quantity');
      }
    });
  }

  protected onQuantityInput(event: Event): void {
    this.quantityText.set(filterDecimalInput((event.target as HTMLInputElement).value));
  }

  protected fillAll(): void {
    const quantity = this.holding().quantity;

    this.quantityText.set(
      new Intl.NumberFormat(this.#locale, { maximumFractionDigits: 6, useGrouping: false }).format(quantity),
    );
    focusInitial(this.#host.nativeElement, 'holding-sell-quantity');
  }

  protected dismiss(): void {
    this.#outcome.dismiss();
  }

  protected onClosed(): void {
    const result = this.#outcome.settle();

    if (result) {
      this.sold.emit(result.value.result);
    } else {
      this.dismissed.emit();
    }
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    void this.confirm();
  }

  protected async confirm(): Promise<void> {
    const quantity = this.#store.quantity();

    if (!this.valid() || quantity === null) {
      return;
    }

    const result = await this.#store.save(this.holding().id, quantity);

    if (result) {
      this.#outcome.succeed({ result, change: this.#record(result) });
    }
  }

  #record(result: SellResult): HoldingChange | null {
    if (result.outcome === 'closed') {
      this.#changes.removed(this.holding().id);

      return null;
    }

    return this.#changes.touched(this.holding().id);
  }
}

import {
  Component,
  ElementRef,
  LOCALE_ID,
  afterRenderEffect,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import {
  UiAlert,
  UiAmount,
  UiButton,
  UiCard,
  UiDialog,
  UiFact,
  UiFacts,
  UiField,
  UiInput,
  formatAmount,
} from '@joanroucoux/cairn-ui';
import { TranslocoPipe, translateSignal } from '@jsverse/transloco';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { focusInitial } from '@shared/dialog/focus-initial';
import { decimalPlaces } from '@shared/format/decimal-places';
import { filterDecimalInput } from '@shared/format/parse-decimal';
import { pluralKey } from '@shared/format/plural-key';

import { buyPreview } from '../trade-preview';
import { HoldingBuyDialogStore } from './holding-buy-dialog-store';

@Component({
  selector: 'app-holding-buy-dialog',
  imports: [TranslocoPipe, UiAlert, UiAmount, UiButton, UiCard, UiDialog, UiFact, UiFacts, UiField, UiInput],
  templateUrl: './holding-buy-dialog.html',
  providers: [HoldingBuyDialogStore],
})
export class HoldingBuyDialog {
  #store = inject(HoldingBuyDialogStore);
  #locale = inject(LOCALE_ID);

  readonly holding = input.required<HoldingResponse>();
  readonly bought = output<HoldingResponse>();
  readonly dismissed = output<void>();

  protected readonly open = signal(true);
  protected readonly quantityText = this.#store.quantityText;
  protected readonly priceText = this.#store.priceText;
  protected readonly submitting = this.#store.submitting;
  protected readonly error = this.#store.error;
  protected readonly valid = this.#store.valid;

  protected readonly fmtQty = (value: number): string =>
    formatAmount(value, { locale: this.#locale, fractionDigits: decimalPlaces(this.holding().quantity) });

  protected readonly preview = computed(() => {
    const holding = this.holding();
    const quantity = this.#store.quantity();
    const price = this.#store.price();

    return quantity !== null && quantity > 0 && price !== null && price > 0
      ? buyPreview(holding.quantity, holding.averageCost ?? null, quantity, price)
      : null;
  });

  readonly #ctaQuantity = computed(() => {
    const quantity = this.#store.quantity();

    return quantity !== null && quantity > 0 && this.valid() ? quantity : null;
  });

  protected readonly cta = translateSignal(
    computed(() => {
      const quantity = this.#ctaQuantity();

      return quantity === null ? 'buy.submitDefault' : pluralKey('buy.submit', quantity);
    }),
    computed(() => ({ count: this.#ctaQuantity() ?? 0 })),
  );

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterRenderEffect(() => {
      if (this.open() && this.#host.nativeElement.querySelector('dialog')?.open) {
        focusInitial(this.#host.nativeElement, 'holding-buy-quantity');
      }
    });
  }

  protected onQuantityInput(event: Event): void {
    this.quantityText.set(filterDecimalInput((event.target as HTMLInputElement).value));
  }

  protected onPriceInput(event: Event): void {
    this.priceText.set(filterDecimalInput((event.target as HTMLInputElement).value));
  }

  #result: HoldingResponse | null = null;

  protected dismiss(): void {
    this.open.set(false);
  }

  protected onClosed(): void {
    if (this.#result !== null) {
      this.bought.emit(this.#result);
    } else {
      this.dismissed.emit();
    }
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    void this.confirm();
  }

  protected async confirm(): Promise<void> {
    const bought = await this.#store.save(this.holding().id);

    if (bought) {
      this.#result = bought;
      this.open.set(false);
    }
  }
}

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
import { toSignal } from '@angular/core/rxjs-interop';

import { UiAmount, UiButton, UiDialog, UiField, UiInput, formatAmount } from '@joanroucoux/cairn-ui';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { focusInitial } from '@shared/dialog/focus-initial';
import { decimalPlaces } from '@shared/format/decimal-places';
import { filterDecimalInput } from '@shared/format/parse-decimal';
import { pluralKey } from '@shared/format/plural-key';

import { buyPreview } from '../trade-preview';
import { HoldingBuyDialogStore } from './holding-buy-dialog-store';

@Component({
  selector: 'app-holding-buy-dialog',
  imports: [TranslocoPipe, UiAmount, UiButton, UiDialog, UiField, UiInput],
  templateUrl: './holding-buy-dialog.html',
  providers: [HoldingBuyDialogStore],
})
export class HoldingBuyDialog {
  #store = inject(HoldingBuyDialogStore);
  #transloco = inject(TranslocoService);
  readonly #translocoEvents = toSignal(this.#transloco.events$, { initialValue: null });
  #locale = inject(LOCALE_ID);

  readonly holding = input.required<HoldingResponse>();
  readonly bought = output<void>();
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

  protected readonly cta = computed(() => {
    this.#translocoEvents();
    const quantity = this.#store.quantity();

    return quantity !== null && quantity > 0 && this.valid()
      ? this.#transloco.translate(pluralKey('holdings.buy.submit', quantity), { count: quantity })
      : this.#transloco.translate('holdings.buy.submitDefault');
  });

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

  protected dismiss(): void {
    this.open.set(false);
    this.dismissed.emit();
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    void this.confirm();
  }

  protected async confirm(): Promise<void> {
    if (await this.#store.save(this.holding().id)) {
      this.open.set(false);
      this.bought.emit();
    }
  }
}

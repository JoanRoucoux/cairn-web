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

import { UiButton, UiDialog, UiField, UiInput, formatAmount } from '@joanroucoux/cairn-ui';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { decimalPlaces } from '@shared/format/decimal-places';
import { filterDecimalInput } from '@shared/format/parse-decimal';
import { pluralKey } from '@shared/format/plural-key';

import { sellPreview } from '../trade-preview';
import { HoldingSellDialogStore } from './holding-sell-dialog-store';

@Component({
  selector: 'app-holding-sell-dialog',
  imports: [TranslocoPipe, UiButton, UiDialog, UiField, UiInput],
  templateUrl: './holding-sell-dialog.html',
  providers: [HoldingSellDialogStore],
})
export class HoldingSellDialog {
  #store = inject(HoldingSellDialogStore);
  #transloco = inject(TranslocoService);
  #locale = inject(LOCALE_ID);

  readonly holding = input.required<HoldingResponse>();
  readonly sold = output<boolean>();
  readonly dismissed = output<void>();

  protected readonly open = signal(true);
  protected readonly quantityText = this.#store.quantityText;
  protected readonly submitting = this.#store.submitting;
  protected readonly error = this.#store.error;

  protected readonly fmt = (value: number | null | undefined): string =>
    formatAmount(value, { locale: this.#locale, currency: 'EUR' });

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

  protected readonly hint = computed(() => {
    const holding = this.holding();
    const key = this.over()
      ? pluralKey('holdings.sell.over', holding.quantity)
      : pluralKey('holdings.sell.held', holding.quantity);

    return this.#transloco.translate(key, { count: holding.quantity, price: this.fmt(holding.price) });
  });

  protected readonly cta = computed(() => {
    const quantity = this.#store.quantity();

    if (!this.valid() || quantity === null) {
      return this.#transloco.translate('holdings.sell.submitDefault');
    }

    return this.closes()
      ? this.#transloco.translate('holdings.sell.submitCloses')
      : this.#transloco.translate(pluralKey('holdings.sell.submit', quantity), { count: quantity });
  });

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterRenderEffect(() => {
      if (this.open() && this.#host.nativeElement.querySelector('dialog')?.open) {
        this.#host.nativeElement.querySelector<HTMLInputElement>('[data-testid="holding-sell-quantity"]')?.focus();
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
  }

  protected dismiss(): void {
    this.open.set(false);
    this.dismissed.emit();
  }

  protected async confirm(): Promise<void> {
    const quantity = this.#store.quantity();

    if (!this.valid() || quantity === null) {
      return;
    }

    const outcome = await this.#store.save(this.holding().id, quantity);

    if (outcome) {
      this.open.set(false);
      this.sold.emit(outcome === 'closed');
    }
  }
}

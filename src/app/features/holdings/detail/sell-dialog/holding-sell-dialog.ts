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

import { UiAlert, UiAmount, UiButton, UiDelta, UiDialog, UiField, UiInput, formatAmount } from '@joanroucoux/cairn-ui';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { focusInitial } from '@shared/dialog/focus-initial';
import { decimalPlaces } from '@shared/format/decimal-places';
import { filterDecimalInput } from '@shared/format/parse-decimal';
import { pluralKey } from '@shared/format/plural-key';

import { sellPreview } from '../trade-preview';
import { HoldingSellDialogStore } from './holding-sell-dialog-store';

@Component({
  selector: 'app-holding-sell-dialog',
  imports: [TranslocoPipe, UiAlert, UiAmount, UiButton, UiDelta, UiDialog, UiField, UiInput],
  templateUrl: './holding-sell-dialog.html',
  providers: [HoldingSellDialogStore],
})
export class HoldingSellDialog {
  #store = inject(HoldingSellDialogStore);
  #transloco = inject(TranslocoService);
  readonly #translocoEvents = toSignal(this.#transloco.events$, { initialValue: null });
  #locale = inject(LOCALE_ID);

  readonly holding = input.required<HoldingResponse>();
  readonly sold = output<boolean>();
  readonly dismissed = output<void>();

  protected readonly open = signal(true);
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

  protected readonly held = computed(() => {
    this.#translocoEvents();

    return this.#transloco.translate(pluralKey('holdings.sell.held', this.holding().quantity), {
      count: this.holding().quantity,
    });
  });

  protected readonly overHint = computed(() => {
    this.#translocoEvents();

    return this.#transloco.translate(pluralKey('holdings.sell.over', this.holding().quantity), {
      count: this.holding().quantity,
    });
  });

  protected readonly cta = computed(() => {
    this.#translocoEvents();
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
    this.open.set(false);
    this.dismissed.emit();
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

    const outcome = await this.#store.save(this.holding().id, quantity);

    if (outcome) {
      this.open.set(false);
      this.sold.emit(outcome === 'closed');
    }
  }
}

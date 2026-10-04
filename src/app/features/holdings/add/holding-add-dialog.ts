import { Component, ElementRef, afterRenderEffect, computed, effect, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { UiAlert } from '@joanroucoux/cairn-ui/alert';
import { UiButton } from '@joanroucoux/cairn-ui/button';
import { UiDialog } from '@joanroucoux/cairn-ui/dialog';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import type {
  AssetClass,
  HoldingResponse,
  InstrumentCandidateResponse,
  SearchableSource,
} from '@core/api-client/cairnAPI.schemas';

import { injectDialogOutcome } from '@shared/dialog/dialog-outcome';
import { injectToast } from '@shared/feedback/toast';

import { type HoldingChange, HoldingChanges } from '../holding-changes';
import { type AddMode, HoldingAddDialogStore } from './holding-add-dialog-store';
import { HoldingAddManual } from './manual/holding-add-manual';
import { HoldingAddPicked } from './picked/holding-add-picked';
import { type AccountOption, HoldingAddPosition } from './position/holding-add-position';
import type { SourceFilter } from './search-plan';
import { HoldingAddSearch } from './search/holding-add-search';
import { HoldingAddSirius } from './sirius/holding-add-sirius';

const inputValue = (event: Event): string => (event.target as HTMLInputElement | HTMLSelectElement).value;

@Component({
  selector: 'app-holding-add-dialog',
  imports: [
    HoldingAddManual,
    HoldingAddPicked,
    HoldingAddPosition,
    HoldingAddSearch,
    HoldingAddSirius,
    TranslocoPipe,
    UiAlert,
    UiButton,
    UiDialog,
  ],
  templateUrl: './holding-add-dialog.html',
  providers: [HoldingAddDialogStore],
})
export class HoldingAddDialog {
  #store = inject(HoldingAddDialogStore);

  readonly presetAccountId = input<string | null>(null);
  readonly saved = output<HoldingResponse>();
  readonly dismissed = output<void>();

  #toast = injectToast();
  #changes = inject(HoldingChanges);
  readonly #outcome = injectDialogOutcome<{ holding: HoldingResponse; change: HoldingChange; toast: string }>(
    ({ change, toast }) => {
      this.#toast(toast);
      this.#changes.reveal(change);
    },
  );

  protected readonly open = this.#outcome.open;

  protected readonly accounts = this.#store.accounts;
  protected readonly accountId = this.#store.accountId;
  protected readonly query = this.#store.query;
  protected readonly filter = this.#store.filter;
  protected readonly mode = this.#store.mode;
  protected readonly picked = this.#store.picked;
  protected readonly showResults = this.#store.showResults;
  protected readonly tracked = this.#store.tracked;
  protected readonly trackedState = this.#store.trackedState;
  protected readonly groups = this.#store.groups;
  protected readonly noneFound = this.#store.noneFound;
  protected readonly narrowed = this.#store.narrowed;
  protected readonly siriusIsinText = this.#store.siriusIsinText;
  protected readonly manualName = this.#store.manualName;
  protected readonly manualClass = this.#store.manualClass;
  protected readonly manualPriceText = this.#store.manualPriceText;
  protected readonly titleReady = this.#store.titleReady;
  protected readonly quantityText = this.#store.quantityText;
  protected readonly averageCostText = this.#store.averageCostText;
  protected readonly value = this.#store.value;
  protected readonly valid = this.#store.valid;
  protected readonly submitting = this.#store.submitting;
  protected readonly error = this.#store.error;

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #transloco = inject(TranslocoService);
  readonly #translocoEvents = toSignal(this.#transloco.events$);

  protected readonly accountOptions = computed<AccountOption[]>(() => {
    this.#translocoEvents();

    return this.accounts.value().map((account) => ({
      id: account.id,
      label: `${account.name} · ${this.#transloco.translate(`enums.accountType.${account.type}`)}`,
    }));
  });

  protected readonly submitKey = computed(() => {
    if (this.mode() === 'sirius') {
      return 'holdings.add.submitSirius';
    }

    return this.mode() === 'manual' || this.picked()?.kind === 'online'
      ? 'holdings.add.submitNew'
      : 'holdings.add.submit';
  });

  readonly #focusTarget = computed(() => {
    switch (this.mode()) {
      case 'sirius':
        return 'holding-add-sirius-isin';
      case 'manual':
        return 'holding-add-manual-name';
      default:
        return this.picked() ? 'holding-add-quantity' : 'holding-add-query';
    }
  });

  constructor() {
    effect(() => {
      const list = this.accounts.value();
      const chosen = list.find((account) => account.id === this.presetAccountId()) ?? list[0];

      if (chosen && this.accountId() === '') {
        this.accountId.set(chosen.id);
      }
    });

    afterRenderEffect(() => {
      const target = this.#focusTarget();

      if (this.open() && this.#host.nativeElement.querySelector('dialog')?.open) {
        this.#host.nativeElement.querySelector<HTMLElement>(`[data-testid="${target}"]`)?.focus();
      }
    });
  }

  protected onQueryInput(event: Event): void {
    this.#store.onQueryChange(inputValue(event));
  }

  protected onFilterChange(filter: SourceFilter): void {
    this.#store.chooseFilter(filter);
  }

  protected pickTracked(title: HoldingResponse): void {
    this.#store.pickTracked(title);
  }

  protected pickCandidate(candidate: InstrumentCandidateResponse): void {
    this.#store.pickCandidate(candidate);
  }

  protected retry(source: SearchableSource): void {
    this.#store.retry(source);
  }

  protected retryTracked(): void {
    this.#store.retryTracked();
  }

  protected openMode(mode: AddMode): void {
    this.#store.openMode(mode);
  }

  protected unpick(): void {
    this.#store.unpick();
  }

  protected onSiriusIsinInput(event: Event): void {
    this.#store.typeSiriusIsin(inputValue(event));
  }

  protected onManualNameInput(event: Event): void {
    this.#store.typeManualName(inputValue(event));
  }

  protected onManualClassChange(event: Event): void {
    this.#store.chooseManualClass(inputValue(event) as AssetClass);
  }

  protected onManualPriceInput(event: Event): void {
    this.#store.typeManualPrice(inputValue(event));
  }

  protected onAccountChange(event: Event): void {
    this.#store.chooseAccount(inputValue(event));
  }

  protected onQuantityInput(event: Event): void {
    this.#store.typeQuantity(inputValue(event));
  }

  protected onAverageCostInput(event: Event): void {
    this.#store.typeAverageCost(inputValue(event));
  }

  protected dismiss(): void {
    this.#outcome.dismiss();
  }

  protected onClosed(): void {
    const result = this.#outcome.settle();

    if (result) {
      this.saved.emit(result.value.holding);
    } else {
      this.dismissed.emit();
    }
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();

    if (this.valid() && !this.submitting()) {
      void this.confirm();
    }
  }

  protected async confirm(): Promise<void> {
    const saved = await this.#store.save();

    if (saved) {
      this.#outcome.succeed({
        holding: saved,
        change: this.#changes.touched(saved.id),
        toast: 'holdings.toasts.added',
      });
    }
  }
}

import {
  Component,
  ElementRef,
  LOCALE_ID,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { UiAlert } from '@joanroucoux/cairn-ui/alert';
import { UiButton } from '@joanroucoux/cairn-ui/button';
import { UiDialog } from '@joanroucoux/cairn-ui/dialog';
import { UiField } from '@joanroucoux/cairn-ui/field';
import { UiSelect } from '@joanroucoux/cairn-ui/select';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import {
  AssetClass,
  type HoldingResponse,
  type InstrumentCandidateResponse,
  type InstrumentResponse,
} from '@core/api-client/cairnAPI.schemas';

import { injectDialogOutcome } from '@shared/dialog/dialog-outcome';
import { injectToast } from '@shared/feedback/toast';
import { filterDecimalInput } from '@shared/format/parse-decimal';

import { type HoldingChange, HoldingChanges } from '../holding-changes';
import { HoldingAddDialogStore, type PickedInstrument } from './holding-add-dialog-store';
import { isinOf } from './isin';
import { HoldingAddPicked } from './picked/holding-add-picked';
import { type CatalogResult, HoldingAddSearch } from './search/holding-add-search';

const CATALOG_RESULT_LIMIT = 4;

@Component({
  selector: 'app-holding-add-dialog',
  imports: [HoldingAddPicked, HoldingAddSearch, TranslocoPipe, UiAlert, UiButton, UiDialog, UiField, UiSelect],
  templateUrl: './holding-add-dialog.html',
  providers: [HoldingAddDialogStore],
})
export class HoldingAddDialog {
  #store = inject(HoldingAddDialogStore);

  readonly presetAccountId = input<string | null>(null);
  readonly replaceHoldingId = input<string | null>(null);
  readonly initialQuery = input('');
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
  protected readonly filteredCatalog = this.#store.filteredCatalog;
  protected readonly catalogState = this.#store.catalogState;
  protected readonly candidates = this.#store.candidates;
  protected readonly searchingOnline = this.#store.searchingOnline;
  protected readonly onlineError = this.#store.onlineError;
  protected readonly onlineSearched = this.#store.onlineSearched;
  protected readonly picked = this.#store.picked;
  protected readonly assetClass = this.#store.assetClass;
  protected readonly assetClasses = Object.values(AssetClass);
  protected readonly quantityText = this.#store.quantityText;
  protected readonly averageCostText = this.#store.averageCostText;
  protected readonly probePrice = this.#store.probePrice;
  protected readonly valueAtProbe = this.#store.valueAtProbe;
  protected readonly valid = this.#store.valid;
  protected readonly submitting = this.#store.submitting;
  protected readonly error = this.#store.error;
  protected readonly instrumentError = this.#store.instrumentError;
  protected readonly duplicate = this.#store.duplicate;
  protected readonly replacing = computed(() => this.replaceHoldingId() !== null);
  readonly #replacedWith = signal<string | null>(null);
  protected readonly replacingKey = computed(() => (this.submitting() ? this.#replacedWith() : null));

  readonly #collator = new Intl.Collator(inject(LOCALE_ID), { sensitivity: 'base', numeric: true });
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #transloco = inject(TranslocoService);
  readonly #translocoEvents = toSignal(this.#transloco.events$);

  protected readonly catalogResults = computed<CatalogResult[]>(() =>
    this.filteredCatalog()
      .map((instrument) => ({
        instrument,
        lineCount: this.#store.lineCountOf(instrument.id),
        foreignCurrency: this.#store.foreignCurrencyOf(instrument),
      }))
      .sort(
        (a, b) =>
          Number(a.foreignCurrency !== undefined) - Number(b.foreignCurrency !== undefined) ||
          this.#collator.compare(a.instrument.name, b.instrument.name),
      )
      .slice(0, CATALOG_RESULT_LIMIT),
  );

  protected readonly accountOptions = computed(() => {
    this.#translocoEvents();

    return this.accounts.value().map((account) => ({
      id: account.id,
      label: `${account.name} · ${this.#transloco.translate(`enums.accountType.${account.type}`)}`,
    }));
  });

  protected readonly trialPrice = this.#store.probePrice;
  protected readonly gainAtProbe = this.#store.gainAtProbe;

  protected readonly pickedSourceLabel = computed(() => {
    this.#translocoEvents();
    const picked = this.picked();

    return picked?.kind === 'online' ? this.#transloco.translate(`enums.priceSource.${picked.candidate.source}`) : '';
  });

  protected readonly pickedSub = computed(() => {
    this.#translocoEvents();
    const picked = this.picked();

    if (picked?.kind === 'catalog') {
      const { assetClass, isin, priceSource } = picked.instrument;

      return [
        isin,
        this.#transloco.translate(`enums.assetClass.${assetClass}`),
        this.#transloco.translate(`enums.priceSource.${priceSource}`),
      ]
        .filter(Boolean)
        .join(' · ');
    }

    if (picked?.kind === 'online') {
      return [
        picked.candidate.isin ?? isinOf(this.query()),
        picked.candidate.exchange,
        picked.candidate.symbol ?? picked.candidate.sourceRef,
      ]
        .filter(Boolean)
        .join(' · ');
    }

    return '';
  });

  constructor() {
    effect(() => {
      this.#store.replaceHoldingId.set(this.replaceHoldingId());

      const initialQuery = this.initialQuery();

      if (initialQuery) {
        untracked(() => this.#store.start(initialQuery));
      }
    });

    effect(() => {
      const list = this.accounts.value();
      const chosen = list.find((account) => account.id === this.presetAccountId()) ?? list[0];

      if (chosen && this.accountId() === '') {
        this.accountId.set(chosen.id);
      }
    });

    afterRenderEffect(() => {
      if (this.open() && this.#host.nativeElement.querySelector('dialog')?.open) {
        this.#host.nativeElement.querySelector<HTMLSelectElement>('[data-testid="holding-add-account"]')?.focus();
      }
    });

    afterRenderEffect(() => {
      if (this.picked()) {
        this.#host.nativeElement.querySelector<HTMLInputElement>('[data-testid="holding-add-quantity"]')?.focus();
      }
    });
  }

  protected onQueryInput(event: Event): void {
    this.#store.onQueryChange((event.target as HTMLInputElement).value);
  }

  protected onAccountChange(event: Event): void {
    this.accountId.set((event.target as HTMLSelectElement).value);
  }

  protected onAssetClassChange(event: Event): void {
    this.assetClass.set((event.target as HTMLSelectElement).value as AssetClass);
  }

  protected onQuantityInput(event: Event): void {
    this.quantityText.set(filterDecimalInput((event.target as HTMLInputElement).value));
  }

  protected onAverageCostInput(event: Event): void {
    this.averageCostText.set(filterDecimalInput((event.target as HTMLInputElement).value));
  }

  protected pickCatalog(instrument: InstrumentResponse): void {
    if (this.replacing()) {
      this.#replacedWith.set(instrument.id);
      void this.replace({ kind: 'catalog', instrument });
    } else {
      this.#store.pickCatalog(instrument);
    }
  }

  protected pickOnline(candidate: InstrumentCandidateResponse): void {
    if (this.replacing()) {
      this.#replacedWith.set(candidate.sourceRef);
      void this.replace({ kind: 'online', candidate });
    } else {
      this.#store.pickOnline(candidate);
    }
  }

  protected pickManual(): void {
    this.#store.pickManual();
  }

  protected unpick(): void {
    this.#store.unpick();
  }

  protected pickedName(): string {
    const picked = this.picked() as PickedInstrument;

    return picked.kind === 'catalog'
      ? picked.instrument.name
      : picked.kind === 'online'
        ? picked.candidate.name
        : picked.name;
  }

  protected isNew(): boolean {
    return this.picked()?.kind !== 'catalog' && this.picked() !== undefined;
  }

  protected retryCatalog(): void {
    this.#store.reloadCatalog();
  }

  protected retryOnline(): void {
    void this.#store.searchOnline();
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

  protected async replace(picked: PickedInstrument): Promise<void> {
    const moved = await this.#store.replaceWith(picked);

    if (moved) {
      this.#outcome.succeed({
        holding: moved,
        change: this.#changes.touched(moved.id),
        toast: 'holdings.toasts.listingChanged',
      });
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

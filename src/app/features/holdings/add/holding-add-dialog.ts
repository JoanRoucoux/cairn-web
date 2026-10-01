import {
  Component,
  ElementRef,
  type OnInit,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { UiButton, UiDialog, UiField, UiSelect } from '@joanroucoux/cairn-ui';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import {
  AssetClass,
  type InstrumentCandidateResponse,
  type InstrumentResponse,
} from '@core/api-client/cairnAPI.schemas';

import { filterDecimalInput } from '@shared/format/parse-decimal';

import { HoldingAddDialogStore, type PickedInstrument } from './holding-add-dialog-store';
import { HoldingAddPicked } from './picked/holding-add-picked';
import { type CatalogResult, HoldingAddSearch } from './search/holding-add-search';

const CATALOG_RESULT_LIMIT = 4;
const ISIN = /^[A-Z]{2}[A-Z0-9]{9}d$/i;

@Component({
  selector: 'app-holding-add-dialog',
  imports: [HoldingAddPicked, HoldingAddSearch, TranslocoPipe, UiButton, UiDialog, UiField, UiSelect],
  templateUrl: './holding-add-dialog.html',
  providers: [HoldingAddDialogStore],
})
export class HoldingAddDialog implements OnInit {
  #store = inject(HoldingAddDialogStore);

  readonly presetAccountId = input<string | null>(null);
  readonly saved = output<void>();
  readonly dismissed = output<void>();

  protected readonly open = signal(true);

  protected readonly accounts = this.#store.accounts;
  protected readonly accountId = this.#store.accountId;
  protected readonly query = this.#store.query;
  protected readonly filteredCatalog = this.#store.filteredCatalog;
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

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #transloco = inject(TranslocoService);
  readonly #translocoEvents = toSignal(this.#transloco.events$);

  protected readonly catalogResults = computed<CatalogResult[]>(() =>
    this.filteredCatalog()
      .slice(0, CATALOG_RESULT_LIMIT)
      .map((instrument) => ({ instrument, lineCount: this.#store.lineCountOf(instrument.id) })),
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
      const typed = this.query().trim();
      const isin = ISIN.test(typed) ? typed.toUpperCase() : null;

      return [isin, picked.candidate.exchange, picked.candidate.sourceRef].filter(Boolean).join(' · ');
    }

    return '';
  });

  constructor() {
    effect(() => {
      const first = this.accounts.hasValue() ? this.accounts.value()[0] : undefined;

      if (first && this.accountId() === '') {
        this.accountId.set(first.id);
      }
    });

    afterRenderEffect(() => {
      if (this.open() && this.#host.nativeElement.querySelector('dialog')?.open) {
        this.#host.nativeElement.querySelector<HTMLSelectElement>('[data-testid="holding-add-account"]')?.focus();
      }
    });
  }

  ngOnInit(): void {
    const preset = this.presetAccountId();
    if (preset) {
      this.accountId.set(preset);
    }
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
    this.#store.pickCatalog(instrument);
  }

  protected pickOnline(candidate: InstrumentCandidateResponse): void {
    this.#store.pickOnline(candidate);
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

  protected retryOnline(): void {
    void this.#store.searchOnline();
  }

  protected dismiss(): void {
    this.open.set(false);
    this.dismissed.emit();
  }

  protected async confirm(): Promise<void> {
    if (await this.#store.save()) {
      this.open.set(false);
      this.saved.emit();
    }
  }
}

import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { type AsyncState } from '@joanroucoux/cairn-ui';
import { firstValueFrom, map } from 'rxjs';

import { AccountService } from '@core/api-client/account/account.service';
import type {
  AssetClass,
  HoldingResponse,
  InstrumentCandidateResponse,
  InstrumentResponse,
} from '@core/api-client/cairnAPI.schemas';
import { HoldingService } from '@core/api-client/holding/holding.service';
import { InstrumentService } from '@core/api-client/instrument/instrument.service';

import { normalizeSearch } from '@shared/format/normalize-search';
import { parseDecimal } from '@shared/format/parse-decimal';

import { isinOf } from './isin';

const SEARCH_DEBOUNCE_MS = 300;
const MIN_ONLINE_QUERY = 3;

export type PickedInstrument =
  | { kind: 'catalog'; instrument: InstrumentResponse }
  | { kind: 'online'; candidate: InstrumentCandidateResponse }
  | { kind: 'manual'; name: string };

@Injectable()
export class HoldingAddDialogStore {
  #accountsApiClient = inject(AccountService);
  #instrumentsApiClient = inject(InstrumentService);
  #holdingsApiClient = inject(HoldingService);

  readonly accounts = rxResource({
    stream: () =>
      this.#accountsApiClient
        .listAccounts()
        .pipe(map((accounts) => accounts.filter((account) => account.type !== 'SAVINGS'))),
    defaultValue: [],
  });

  readonly instruments = rxResource({
    stream: () => this.#instrumentsApiClient.listInstruments(),
    defaultValue: [],
  });

  readonly holdings = rxResource({
    stream: () => this.#holdingsApiClient.listHoldings(),
    defaultValue: [],
  });

  readonly replaceHoldingId = signal<string | null>(null);
  readonly query = signal('');
  readonly accountId = signal('');
  readonly quantityText = signal('');
  readonly averageCostText = signal('');

  readonly picked = signal<PickedInstrument | undefined>(undefined);
  readonly assetClass = signal<AssetClass | undefined>(undefined);

  readonly candidates = signal<InstrumentCandidateResponse[]>([]);
  readonly searchingOnline = signal(false);
  readonly onlineError = signal(false);
  readonly onlineSearched = signal(false);

  readonly submitting = signal(false);
  readonly error = signal(false);
  readonly instrumentError = signal(false);
  readonly duplicate = signal(false);

  #created: { picked: PickedInstrument; id: string } | undefined;
  #debounceHandle: ReturnType<typeof setTimeout> | undefined;

  readonly #knownHoldings = computed(() => (this.holdings.hasValue() ? this.holdings.value() : []));

  readonly #ownInstrumentId = computed(
    () => this.#knownHoldings().find((holding) => holding.id === this.replaceHoldingId())?.instrumentId,
  );

  readonly #lineCounts = computed(() => {
    const counts = new Map<string, number>();

    for (const holding of this.holdings.value()) {
      counts.set(holding.instrumentId, (counts.get(holding.instrumentId) ?? 0) + 1);
    }

    return counts;
  });

  foreignCurrencyOf(instrument: InstrumentResponse): string | undefined {
    const quoted = this.#knownHoldings().find((holding) => holding.instrumentId === instrument.id)?.priceCurrency;
    const currency = quoted ?? instrument.currency;

    return currency !== 'EUR' ? currency : undefined;
  }

  lineCountOf(instrumentId: string): number | null {
    const status = this.holdings.status();

    return status === 'resolved' || status === 'reloading' || status === 'local'
      ? (this.#lineCounts().get(instrumentId) ?? 0)
      : null;
  }

  readonly filteredCatalog = computed(() => {
    const query = normalizeSearch(this.query().trim());

    if (!query) {
      return [];
    }

    const own = this.#ownInstrumentId();

    return (this.instruments.hasValue() ? this.instruments.value() : [])
      .filter((instrument) => instrument.id !== own)
      .filter((instrument) =>
        normalizeSearch(`${instrument.name} ${instrument.isin ?? ''} ${instrument.symbol ?? ''}`).includes(query),
      );
  });

  readonly catalogState = computed<AsyncState>(() => {
    const status = this.instruments.status();

    return status === 'error' ? 'error' : status === 'loading' ? 'loading' : 'ready';
  });

  readonly quantity = computed(() => parseDecimal(this.quantityText()));
  readonly averageCost = computed(() => parseDecimal(this.averageCostText()));

  readonly probePrice = computed(() => {
    const picked = this.picked();

    return picked?.kind === 'online' ? (picked.candidate.probePrice ?? null) : null;
  });

  readonly valueAtProbe = computed(() => {
    const quantity = this.quantity();
    const price = this.probePrice();

    return quantity !== null && quantity > 0 && price !== null ? quantity * price : null;
  });

  readonly gainAtProbe = computed(() => {
    const quantity = this.quantity();
    const price = this.probePrice();
    const cost = this.averageCost();

    return quantity !== null && quantity > 0 && price !== null && cost !== null && cost > 0
      ? quantity * (price - cost)
      : null;
  });

  readonly valid = computed(() => {
    const quantity = this.quantity();
    const picked = this.picked();

    return (
      picked !== undefined &&
      (picked.kind !== 'manual' || this.assetClass() !== undefined) &&
      this.accountId() !== '' &&
      quantity !== null &&
      quantity > 0
    );
  });

  start(query: string): void {
    this.query.set(query);

    if (query.trim().length >= MIN_ONLINE_QUERY) {
      void this.searchOnline(query.trim());
    }
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    this.picked.set(undefined);
    this.candidates.set([]);
    this.onlineSearched.set(false);
    this.onlineError.set(false);

    if (this.#debounceHandle !== undefined) {
      clearTimeout(this.#debounceHandle);
    }

    const trimmed = value.trim();

    if (trimmed.length < MIN_ONLINE_QUERY) {
      return;
    }

    this.#debounceHandle = setTimeout(() => void this.searchOnline(trimmed), SEARCH_DEBOUNCE_MS);
  }

  reloadCatalog(): void {
    this.instruments.reload();
  }

  async searchOnline(query: string = this.query().trim()): Promise<void> {
    if (!query) {
      return;
    }

    this.searchingOnline.set(true);
    this.onlineError.set(false);

    try {
      const candidates = await firstValueFrom(this.#instrumentsApiClient.resolveInstrument({ query }));
      this.candidates.set(candidates);
    } catch {
      this.onlineError.set(true);
    } finally {
      this.searchingOnline.set(false);
      this.onlineSearched.set(true);
    }
  }

  pickCatalog(instrument: InstrumentResponse): void {
    this.picked.set({ kind: 'catalog', instrument });
  }

  pickOnline(candidate: InstrumentCandidateResponse): void {
    this.picked.set({ kind: 'online', candidate });
  }

  pickManual(): void {
    this.picked.set({ kind: 'manual', name: this.query().trim() });
    this.assetClass.set(undefined);
  }

  unpick(): void {
    this.picked.set(undefined);
    this.assetClass.set(undefined);
    this.#created = undefined;
  }

  async save(): Promise<HoldingResponse | null> {
    if (!this.valid()) {
      return null;
    }

    const picked = this.picked() as PickedInstrument;
    const accountId = this.accountId();
    const quantity = this.quantity() as number;

    this.submitting.set(true);
    this.error.set(false);
    this.instrumentError.set(false);

    try {
      const instrumentId = await this.#instrumentIdFor(picked);

      if (instrumentId === undefined) {
        return null;
      }

      return await firstValueFrom(
        this.#holdingsApiClient.createHolding({
          accountId,
          instrumentId,
          quantity,
          averageCost: this.averageCost(),
        }),
      );
    } catch {
      this.error.set(true);

      return null;
    } finally {
      this.submitting.set(false);
    }
  }

  async replaceWith(picked: PickedInstrument): Promise<HoldingResponse | null> {
    const holdingId = this.replaceHoldingId();

    if (holdingId === null) {
      return null;
    }

    this.submitting.set(true);
    this.error.set(false);
    this.instrumentError.set(false);
    this.duplicate.set(false);

    try {
      const instrumentId = await this.#instrumentIdFor(picked);

      if (instrumentId === undefined) {
        return null;
      }

      return await firstValueFrom(this.#holdingsApiClient.changeHoldingInstrument(holdingId, { instrumentId }));
    } catch (failure) {
      if (failure instanceof HttpErrorResponse && failure.status === 422) {
        this.duplicate.set(true);
      } else {
        this.error.set(true);
      }

      return null;
    } finally {
      this.submitting.set(false);
    }
  }

  async #instrumentIdFor(picked: PickedInstrument): Promise<string | undefined> {
    if (picked.kind === 'catalog') {
      return picked.instrument.id;
    }

    if (this.#created?.picked === picked) {
      return this.#created.id;
    }

    try {
      const created = await firstValueFrom(
        this.#instrumentsApiClient.createInstrument(
          picked.kind === 'online'
            ? {
                name: picked.candidate.name,
                isin: picked.candidate.isin ?? isinOf(this.query()),
                currency: picked.candidate.currency ?? 'EUR',
                assetClass: picked.candidate.assetClass,
                priceSource: picked.candidate.source,
                sourceRef: picked.candidate.sourceRef,
                symbol: picked.candidate.symbol ?? null,
              }
            : {
                name: picked.name,
                isin: null,
                currency: 'EUR',
                assetClass: this.assetClass() as AssetClass,
                priceSource: 'MANUAL',
                sourceRef: null,
              },
        ),
      );

      this.#created = { picked, id: created.id };

      return created.id;
    } catch {
      this.instrumentError.set(true);
      this.error.set(true);

      return undefined;
    }
  }
}

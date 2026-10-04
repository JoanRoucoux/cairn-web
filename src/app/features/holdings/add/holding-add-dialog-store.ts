import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { type AsyncState } from '@joanroucoux/cairn-ui/async';
import { firstValueFrom, map } from 'rxjs';

import { AccountService } from '@core/api-client/account/account.service';
import type {
  AssetClass,
  CreateHoldingRequest,
  HoldingResponse,
  InstrumentCandidateResponse,
  SearchableSource,
} from '@core/api-client/cairnAPI.schemas';
import { HoldingService } from '@core/api-client/holding/holding.service';
import { InstrumentService } from '@core/api-client/instrument/instrument.service';

import { filterDecimalInput, parseDecimal } from '@shared/format/parse-decimal';

import { compactIsin, isIsin } from './isin';
import { type SourceResult, groupsFor, trackedIdsFound, trackedMatches, trackedTitlesOf } from './result-groups';
import { type SourceFilter, planSearch, resultKey } from './search-plan';

const SEARCH_DEBOUNCE_MS = 300;

export type AddMode = 'search' | 'sirius' | 'manual';

export type PickedTitle =
  { kind: 'tracked'; title: HoldingResponse } | { kind: 'online'; candidate: InstrumentCandidateResponse };

export type AddError = 'failed' | 'duplicate';

type TitleChoice = Pick<CreateHoldingRequest, 'instrumentId' | 'instrument'>;

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

  readonly holdings = rxResource({
    stream: () => this.#holdingsApiClient.listHoldings(),
    defaultValue: [],
  });

  readonly query = signal('');
  readonly filter = signal<SourceFilter>('ALL');
  readonly mode = signal<AddMode>('search');
  readonly picked = signal<PickedTitle | undefined>(undefined);

  readonly #siriusIsinText = signal('');
  readonly siriusIsinText = this.#siriusIsinText.asReadonly();
  readonly #manualName = signal('');
  readonly manualName = this.#manualName.asReadonly();
  readonly #manualClass = signal<AssetClass>('OTHER');
  readonly manualClass = this.#manualClass.asReadonly();
  readonly #manualPriceText = signal('');
  readonly manualPriceText = this.#manualPriceText.asReadonly();

  readonly accountId = signal('');
  readonly #quantityText = signal('');
  readonly quantityText = this.#quantityText.asReadonly();
  readonly #averageCostText = signal('');
  readonly averageCostText = this.#averageCostText.asReadonly();

  readonly submitting = signal(false);
  readonly error = signal<AddError | null>(null);

  readonly #results = signal<ReadonlyMap<string, SourceResult>>(new Map());
  #debounceHandle: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.#debounceHandle));
  }

  readonly #knownHoldings = computed(() => (this.holdings.hasValue() ? this.holdings.value() : []));
  readonly #titles = computed(() => trackedTitlesOf(this.#knownHoldings()));
  readonly #plan = computed(() => planSearch(this.query(), this.filter()));

  readonly showResults = computed(() => this.#plan().length > 0);

  readonly groups = computed(() =>
    groupsFor(this.#plan(), this.#results(), new Set(this.#titles().map((title) => title.instrumentId)), this.filter()),
  );

  readonly tracked = computed(() =>
    this.showResults()
      ? trackedMatches(this.#titles(), this.query(), this.filter(), trackedIdsFound(this.#plan(), this.#results()))
      : [],
  );

  readonly trackedState = computed<AsyncState>(() => {
    const status = this.holdings.status();

    return status === 'error' ? 'error' : status === 'loading' ? 'loading' : 'ready';
  });

  readonly noneFound = computed(
    () =>
      this.showResults() &&
      this.filter() === 'ALL' &&
      this.trackedState() === 'ready' &&
      this.tracked().length === 0 &&
      this.groups().length === 0,
  );

  readonly narrowed = computed(() => {
    const [group] = this.groups();

    return this.filter() !== 'ALL' && group?.state === 'ready' && group.candidates.length === 0;
  });

  readonly siriusIsin = computed(() => compactIsin(this.siriusIsinText()));
  readonly manualPrice = computed(() => parseDecimal(this.manualPriceText()));
  readonly quantity = computed(() => parseDecimal(this.quantityText()));
  readonly averageCost = computed(() => parseDecimal(this.averageCostText()));

  readonly titleReady = computed(() => {
    switch (this.mode()) {
      case 'sirius':
        return isIsin(this.siriusIsinText());
      case 'manual':
        return this.manualName().trim() !== '' && (this.manualPrice() ?? 0) > 0;
      default:
        return this.picked() !== undefined;
    }
  });

  readonly #unitPrice = computed(() => {
    const picked = this.picked();

    if (this.mode() === 'manual') {
      return this.manualPrice();
    }

    if (this.mode() === 'sirius' || picked === undefined) {
      return null;
    }

    if (picked.kind === 'online') {
      return picked.candidate.probePrice ?? null;
    }

    return picked.title.priceCurrency === 'EUR' ? (picked.title.price ?? null) : null;
  });

  readonly value = computed(() => {
    const quantity = this.quantity();
    const price = this.#unitPrice();

    return this.titleReady() && quantity !== null && quantity > 0 && price !== null ? quantity * price : null;
  });

  readonly valid = computed(() => {
    const quantity = this.quantity();

    return this.titleReady() && this.accountId() !== '' && quantity !== null && quantity > 0;
  });

  onQueryChange(value: string): void {
    this.query.set(value);

    if (this.#debounceHandle !== undefined) {
      clearTimeout(this.#debounceHandle);
    }

    this.#debounceHandle = setTimeout(() => {
      this.#debounceHandle = undefined;
      this.#searchMissing();
    }, SEARCH_DEBOUNCE_MS);
  }

  chooseFilter(filter: SourceFilter): void {
    this.filter.set(filter);

    if (this.#debounceHandle === undefined) {
      this.#searchMissing();
    }
  }

  retry(source: SearchableSource): void {
    const query = this.#plan().find((planned) => planned.source === source)?.query;

    if (query) {
      void this.#search(source, query);
    }
  }

  retryTracked(): void {
    this.holdings.reload();
  }

  pickTracked(title: HoldingResponse): void {
    this.picked.set({ kind: 'tracked', title });
    this.error.set(null);
  }

  pickCandidate(candidate: InstrumentCandidateResponse): void {
    this.picked.set({ kind: 'online', candidate });
    this.error.set(null);
  }

  unpick(): void {
    this.picked.set(undefined);
    this.error.set(null);
  }

  openMode(mode: AddMode): void {
    this.mode.set(mode);
    this.error.set(null);
  }

  chooseAccount(accountId: string): void {
    this.accountId.set(accountId);
    this.error.set(null);
  }

  typeSiriusIsin(text: string): void {
    this.#siriusIsinText.set(text.toUpperCase());
    this.error.set(null);
  }

  typeManualName(name: string): void {
    this.#manualName.set(name);
    this.error.set(null);
  }

  chooseManualClass(assetClass: AssetClass): void {
    this.#manualClass.set(assetClass);
    this.error.set(null);
  }

  typeManualPrice(text: string): void {
    this.#manualPriceText.set(filterDecimalInput(text));
    this.error.set(null);
  }

  typeQuantity(text: string): void {
    this.#quantityText.set(filterDecimalInput(text));
  }

  typeAverageCost(text: string): void {
    this.#averageCostText.set(filterDecimalInput(text));
  }

  async save(): Promise<HoldingResponse | null> {
    if (!this.valid()) {
      return null;
    }

    if (this.#alreadyHeld()) {
      this.error.set('duplicate');

      return null;
    }

    this.submitting.set(true);
    this.error.set(null);

    try {
      return await firstValueFrom(
        this.#holdingsApiClient.createHolding({
          accountId: this.accountId(),
          quantity: this.quantity() as number,
          averageCost: this.averageCost(),
          ...this.#titleChoice(),
        }),
      );
    } catch {
      this.error.set('failed');

      return null;
    } finally {
      this.submitting.set(false);
    }
  }

  #searchMissing(): void {
    for (const { source, query } of this.#plan()) {
      const known = this.#results().get(resultKey(source, query ?? ''))?.state;

      if (query !== null && known !== 'ready' && known !== 'loading') {
        void this.#search(source, query);
      }
    }
  }

  async #search(source: SearchableSource, query: string): Promise<void> {
    const key = resultKey(source, query);
    const store = (result: SourceResult): void => this.#results.update((results) => new Map(results).set(key, result));

    store({ state: 'loading', candidates: [] });

    try {
      store({
        state: 'ready',
        candidates: await firstValueFrom(this.#instrumentsApiClient.searchInstruments({ source, query })),
      });
    } catch {
      store({ state: 'error', candidates: [] });
    }
  }

  #alreadyHeld(): boolean {
    const held = this.#knownHoldings().filter((holding) => holding.accountId === this.accountId());
    const picked = this.picked();

    if (this.mode() === 'sirius') {
      return held.some((holding) => holding.priceSource === 'SG_SIRIUS' && holding.sourceRef === this.siriusIsin());
    }

    if (this.mode() === 'manual' || picked === undefined) {
      return false;
    }

    return picked.kind === 'tracked'
      ? held.some((holding) => holding.instrumentId === picked.title.instrumentId)
      : held.some(
          (holding) =>
            holding.priceSource === picked.candidate.source && holding.sourceRef === picked.candidate.sourceRef,
        );
  }

  #titleChoice(): TitleChoice {
    const picked = this.picked() as PickedTitle;

    if (this.mode() === 'sirius') {
      return { instrument: { priceSource: 'SG_SIRIUS', assetClass: 'FUND', isin: this.siriusIsin() } };
    }

    if (this.mode() === 'manual') {
      return {
        instrument: {
          priceSource: 'MANUAL',
          name: this.manualName().trim(),
          assetClass: this.manualClass(),
          price: this.manualPrice(),
        },
      };
    }

    if (picked.kind === 'online') {
      const { candidate } = picked;

      return {
        instrument: {
          priceSource: candidate.source,
          name: candidate.name,
          assetClass: candidate.assetClass,
          sourceRef: candidate.sourceRef,
          isin: candidate.isin ?? null,
          symbol: candidate.symbol ?? null,
          currency: candidate.currency ?? null,
        },
      };
    }

    const { title } = picked;

    return title.priceSource === 'MANUAL' || !title.sourceRef
      ? { instrumentId: title.instrumentId }
      : {
          instrument: {
            priceSource: title.priceSource,
            name: title.instrumentName,
            assetClass: title.assetClass,
            sourceRef: title.sourceRef,
            isin: title.isin ?? null,
            symbol: title.symbol ?? null,
            currency: title.priceCurrency ?? null,
          },
        };
  }
}

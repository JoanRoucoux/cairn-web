import { Component, LOCALE_ID, computed, inject, input } from '@angular/core';

import { UI_AMOUNT_MASKED, formatAmount } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import { ShortDatePipe } from '@shared/format/short-date-pipe';

import type { AccountGroup } from '../../../holding-list-store';
import { filteredCount, metaParts } from '../../group-count';

@Component({
  selector: 'app-holding-account-meta',
  imports: [ShortDatePipe, TranslocoPipe],
  templateUrl: './holding-account-meta.html',
  host: { class: 'text-label text-(--muted-foreground)' },
})
export class HoldingAccountMeta {
  readonly group = input.required<AccountGroup>();

  readonly #locale = inject(LOCALE_ID);
  readonly #masked = inject(UI_AMOUNT_MASKED);

  protected readonly filteredCount = filteredCount;
  protected readonly metaParts = metaParts;
  protected readonly accountTotal = computed(() =>
    formatAmount(this.group().filtered?.accountValueEur, { locale: this.#locale, currency: 'EUR' }, this.#masked()),
  );
}

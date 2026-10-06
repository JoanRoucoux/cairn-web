import { LOCALE_ID, type Signal, computed, inject } from '@angular/core';

import { UI_AMOUNT_MASKED, formatAmount } from '@joanroucoux/cairn-ui/amount';
import { TranslocoService } from '@jsverse/transloco';

import { injectTranslationEvents } from '@core/i18n/translation-events';

import { ShortDatePipe } from '@shared/format/short-date-pipe';

import type { AccountGroup } from '../holding-list-store';
import { filteredCount, metaParts } from './group-count';

export const injectGroupMeta = (group: Signal<AccountGroup>): Signal<string> => {
  const transloco = inject(TranslocoService);
  const events = injectTranslationEvents();
  const locale = inject(LOCALE_ID);
  const masked = inject(UI_AMOUNT_MASKED);
  const shortDate = new ShortDatePipe();

  return computed(() => {
    events();

    const current = group();

    if (current.filtered) {
      const lines = filteredCount(current.filtered.rowCount);

      return transloco.translate('holdings.filteredMeta', {
        total: formatAmount(current.filtered.accountValueEur, { locale, currency: 'EUR' }, masked()),
        lines: transloco.translate(lines.key, lines),
      });
    }

    const parts = metaParts(current);

    return [
      transloco.translate(`enums.accountType.${current.accountType}`),
      current.institution,
      ...[parts.count, parts.balance, parts.unvalued, parts.nonEur].map(
        (part) => part && transloco.translate(part.key, { count: part.count, date: shortDate.transform(part.date) }),
      ),
    ]
      .filter(Boolean)
      .join(' · ');
  });
};

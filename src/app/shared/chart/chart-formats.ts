import { formatAmount } from '@joanroucoux/cairn-ui';

import type { ChartRange } from './chart-range';

export type ChartFormats = {
  value: (value: number) => string;
  delta: (delta: number) => string;
  time: (time: number) => string;
  axis: (time: number) => string;
};

export const chartFormats = (locale: string, masked: boolean, range: ChartRange): ChartFormats => {
  const isFrench = locale.toLowerCase().startsWith('fr');

  const timeFormat =
    range === '1d'
      ? new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
      : new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Paris' });

  const axisFormat =
    range === '1d'
      ? new Intl.DateTimeFormat(
          locale,
          isFrench
            ? { hour: 'numeric', timeZone: 'Europe/Paris' }
            : { hour: 'numeric', minute: '2-digit', timeZone: 'Europe/Paris' },
        )
      : new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'Europe/Paris' });

  return {
    value: (value) => formatAmount(value, { locale, currency: 'EUR' }, masked),
    delta: (delta) => formatAmount(delta, { locale, currency: 'EUR', signed: true, fractionDigits: 2 }, masked),
    time: (time) => timeFormat.format(time),
    axis: (time) => axisFormat.format(time),
  };
};

import { formatAmount } from '@joanroucoux/cairn-ui/amount';

import type { ChartRange } from './chart-range';

export type ChartFormats = {
  value: (value: number) => string;
  delta: (delta: number) => string;
  time: (time: number) => string;
  axis: (time: number) => string;
};

export const chartFormats = (locale: string, masked: boolean, range: ChartRange): ChartFormats => {
  const timeFormat =
    range === '1d'
      ? new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
      : new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Paris' });

  const zone = 'Europe/Paris';
  const axisOptions: Record<ChartRange, Intl.DateTimeFormatOptions> = {
    '1d': { hour: '2-digit', minute: '2-digit', timeZone: zone },
    '7d': { weekday: 'short', day: 'numeric', timeZone: zone },
    '1m': { day: 'numeric', month: 'short', timeZone: zone },
    '1y': { month: 'short', timeZone: zone },
    '5y': { year: 'numeric', timeZone: zone },
    max: { year: 'numeric', timeZone: zone },
  };
  const axisFormat = new Intl.DateTimeFormat(locale, axisOptions[range]);

  return {
    value: (value) => formatAmount(value, { locale, currency: 'EUR' }, masked),
    delta: (delta) => formatAmount(delta, { locale, currency: 'EUR', signed: true, fractionDigits: 2 }, masked),
    time: (time) => timeFormat.format(time),
    axis: (time) => axisFormat.format(time),
  };
};

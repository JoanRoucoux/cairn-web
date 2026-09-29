import { Component, LOCALE_ID, computed, inject, input } from '@angular/core';

import { type MeterTone, UI_AMOUNT_MASKED, UiAmount, UiMeter, formatAmount } from '@joanroucoux/cairn-ui';

import type { AllocationResponse } from '@core/api-client/cairnAPI.schemas';

import { RatioPipe } from '@shared/format/ratio-pipe';

const RAMP_STEPS = 6;

type AllocationRow = AllocationResponse & {
  scaled: number;
  tone: MeterTone;
  valueText: string;
};

@Component({
  selector: 'app-allocation-breakdown',
  imports: [RatioPipe, UiAmount, UiMeter],
  providers: [RatioPipe],
  templateUrl: './allocation-breakdown.html',
})
export class AllocationBreakdown {
  readonly rows = input.required<AllocationResponse[]>();
  readonly heading = input.required<string>();

  #locale = inject(LOCALE_ID);
  #masked = inject(UI_AMOUNT_MASKED);
  #ratio = inject(RatioPipe);

  protected readonly scaledRows = computed<AllocationRow[]>(() => {
    const rows = this.rows();
    const largest = Math.max(...rows.map((row) => row.share), 0);

    return rows.map((row, index) => ({
      ...row,
      scaled: largest === 0 ? 0 : Number((row.share / largest).toFixed(4)),
      tone: ((index % RAMP_STEPS) + 1) as MeterTone,
      valueText: `${this.#ratio.transform(row.share)} - ${formatAmount(row.valueEur, { locale: this.#locale, currency: 'EUR' }, this.#masked())}`,
    }));
  });
}

import { Component, computed, inject, input } from '@angular/core';

import { type MeterTone, UiMeter } from 'cairn-ui';

import type { AllocationResponse } from '@core/api-client/cairnAPI.schemas';

import { MoneyPipe } from '@shared/format/money-pipe';
import { RatioPipe } from '@shared/format/ratio-pipe';

const RAMP_STEPS = 6;

type AllocationRow = AllocationResponse & {
  scaled: number;
  tone: MeterTone;
  valueText: string;
};

@Component({
  selector: 'app-allocation-breakdown',
  imports: [MoneyPipe, RatioPipe, UiMeter],
  // MoneyPipe and RatioPipe inject LOCALE_ID, so they cannot be instantiated with new():
  // providing them here lets the component inject configured instances.
  providers: [MoneyPipe, RatioPipe],
  templateUrl: './allocation-breakdown.html',
})
export class AllocationBreakdown {
  readonly rows = input.required<AllocationResponse[]>();
  readonly heading = input.required<string>();

  #money = inject(MoneyPipe);
  #ratio = inject(RatioPipe);

  protected readonly scaledRows = computed<AllocationRow[]>(() => {
    const rows = this.rows();
    const largest = Math.max(...rows.map((row) => row.share), 0);

    return rows.map((row, index) => ({
      ...row,
      scaled: largest === 0 ? 0 : Number((row.share / largest).toFixed(4)),
      tone: ((index % RAMP_STEPS) + 1) as MeterTone,
      valueText: `${this.#ratio.transform(row.share)} - ${this.#money.transform(row.valueEur)}`,
    }));
  });
}

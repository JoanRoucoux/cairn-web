import { Component, computed, input, output } from '@angular/core';

import { UiAlert } from '@joanroucoux/cairn-ui/alert';
import { UiButton } from '@joanroucoux/cairn-ui/button';
import { UiField } from '@joanroucoux/cairn-ui/field';
import { UiInput } from '@joanroucoux/cairn-ui/input';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideChevronLeft } from '@lucide/angular';

import { pluralKey } from '@shared/format/plural-key';

import { compactIsin, isIsin } from '../isin';

const ISIN_LENGTH = 12;

@Component({
  selector: 'app-holding-add-sirius',
  imports: [LucideChevronLeft, TranslocoPipe, UiAlert, UiButton, UiField, UiInput],
  templateUrl: './holding-add-sirius.html',
  host: { class: 'flex flex-col gap-4' },
})
export class HoldingAddSirius {
  readonly isinText = input.required<string>();

  readonly isinInput = output<Event>();
  readonly back = output<void>();

  protected readonly length = computed(() => compactIsin(this.isinText()).length);

  protected readonly invalid = computed(() => this.length() >= ISIN_LENGTH && !isIsin(this.isinText()));

  protected readonly hintKey = computed(() => {
    const length = this.length();

    if (length === 0) {
      return 'holdings.add.sirius.example';
    }

    if (length < ISIN_LENGTH) {
      return pluralKey('holdings.add.sirius.count', length);
    }

    return this.invalid() ? '' : 'holdings.add.sirius.valid';
  });
}

import { Directive } from '@angular/core';

import { filterDecimalInput } from '@shared/format/parse-decimal';

@Directive({
  selector: 'input[appDecimalInput]',
  host: { '(input)': 'filter($event)' },
})
export class DecimalInput {
  protected filter(event: Event): void {
    const input = event.target as HTMLInputElement;
    const filtered = filterDecimalInput(input.value);

    if (filtered !== input.value) {
      input.value = filtered;
      input.dispatchEvent(new Event('input'));
    }
  }
}

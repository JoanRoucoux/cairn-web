import { Component, inject, input, output } from '@angular/core';

import { UiAlert, UiButton, UiDialog } from '@joanroucoux/cairn-ui';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { injectDialogOutcome } from '@shared/dialog/dialog-outcome';
import { injectToast } from '@shared/feedback/toast';

import { HoldingChanges } from '../../holding-changes';
import { HoldingDeleteStore } from './holding-delete-store';

@Component({
  selector: 'app-holding-delete-dialog',
  imports: [TranslocoPipe, UiAlert, UiButton, UiDialog],
  templateUrl: './holding-delete-dialog.html',
  providers: [HoldingDeleteStore],
})
export class HoldingDeleteDialog {
  #store = inject(HoldingDeleteStore);
  #transloco = inject(TranslocoService);

  readonly holding = input.required<HoldingResponse>();
  readonly deleted = output<string>();
  readonly dismissed = output<void>();

  #toast = injectToast();
  #changes = inject(HoldingChanges);
  readonly #outcome = injectDialogOutcome<string>(() => this.#toast('holdings.toasts.deleted'));

  // The parent creates this component to open the dialog: it is open from its first render.
  protected readonly open = this.#outcome.open;
  protected readonly deleting = this.#store.deleting;
  protected readonly error = this.#store.error;

  // description is a plain string input, so the interpolation happens here rather than in the template.
  protected description(): string {
    return this.#transloco.translate('holdings.delete.description', { name: this.holding().instrumentName });
  }

  protected dismiss(): void {
    this.#outcome.dismiss();
  }

  protected onClosed(): void {
    const result = this.#outcome.settle();

    if (result) {
      this.deleted.emit(result.value);
    } else {
      this.dismissed.emit();
    }
  }

  protected async confirm(): Promise<void> {
    if (await this.#store.remove(this.holding().id)) {
      this.#changes.removed(this.holding().id);
      this.#outcome.succeed(this.holding().id);
    }
  }
}

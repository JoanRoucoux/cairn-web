import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { type DialogOutcome, injectDialogOutcome } from './dialog-outcome';

@Component({ selector: 'app-test-dialog', template: '' })
class TestDialog {
  readonly reveal = vi.fn();
  readonly outcome: DialogOutcome<string> = injectDialogOutcome<string>((value) => this.reveal(value));
}

describe('injectDialogOutcome', () => {
  const create = (): { dialog: TestDialog; destroy: () => void } => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(TestDialog);

    return { dialog: fixture.componentInstance, destroy: () => fixture.destroy() };
  };

  it('opens, and a dismissal closes with no result and nothing to reveal', () => {
    const { dialog } = create();

    expect(dialog.outcome.open()).toBe(true);

    dialog.outcome.dismiss();

    expect(dialog.outcome.open()).toBe(false);
    expect(dialog.outcome.settle()).toBeNull();
    expect(dialog.reveal).not.toHaveBeenCalled();
  });

  it('closes on success and reveals the result once the exit has played', () => {
    const { dialog, destroy } = create();

    dialog.outcome.succeed('h1');

    expect(dialog.outcome.open()).toBe(false);
    expect(dialog.reveal).not.toHaveBeenCalled();
    expect(dialog.outcome.settle()).toEqual({ value: 'h1' });
    expect(dialog.reveal).toHaveBeenCalledExactlyOnceWith('h1');

    destroy();

    expect(dialog.reveal).toHaveBeenCalledOnce();
  });

  it('still reveals a success when the dialog is destroyed before its exit ends', () => {
    const { dialog, destroy } = create();

    dialog.outcome.succeed('h1');
    destroy();

    expect(dialog.reveal).toHaveBeenCalledExactlyOnceWith('h1');
  });

  it('reveals nothing when a dialog with no success is destroyed', () => {
    const { dialog, destroy } = create();

    destroy();

    expect(dialog.reveal).not.toHaveBeenCalled();
  });
});

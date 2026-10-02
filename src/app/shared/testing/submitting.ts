import { expect } from 'vitest';

export const expectSubmitting = (submit: HTMLElement): void => {
  expect(submit.getAttribute('aria-busy')).toBe('true');
  expect(submit.querySelector('.animate-cairn-spin')).not.toBeNull();
  expect(submit.closest('ui-dialog')?.querySelector('dialog')?.getAttribute('aria-busy')).toBe('true');
};

export const expectSubmitting = (submit: HTMLElement): void => {
  expect(submit).toHaveAttribute('aria-busy', 'true');
  expect(submit.querySelector('.animate-cairn-spin')).not.toBeNull();
  expect(submit.closest('ui-dialog')?.querySelector('dialog')).toHaveAttribute('aria-busy', 'true');
};

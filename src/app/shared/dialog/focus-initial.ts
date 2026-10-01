// A target that cannot take focus (Cancel is display:none on a sheet) leaves it on the close cross: try the next one.
export const focusInitial = (host: HTMLElement, ...testIds: string[]): void => {
  for (const testId of testIds) {
    const target = host.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
    target?.focus();
    if (target !== null && document.activeElement === target) {
      return;
    }
  }
};

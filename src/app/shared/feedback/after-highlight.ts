const HIGHLIGHT_WAIT_MS = 2000;

const highlighting = (element: Element): boolean =>
  element
    .getAnimations({ subtree: true })
    .some((animation) =>
      ((animation.effect as KeyframeEffect | null)?.getKeyframes?.() ?? []).some((frame) => 'backgroundColor' in frame),
    );

export const afterHighlight = (targets: () => Element[], done: () => void): void => {
  const start = performance.now();
  const check = (): void => {
    if (targets().some(highlighting) || performance.now() - start >= HIGHLIGHT_WAIT_MS) {
      done();
    } else {
      requestAnimationFrame(check);
    }
  };

  requestAnimationFrame(check);
};

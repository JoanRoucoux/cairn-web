import '@testing-library/jest-dom/vitest';

HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement): void {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function (this: HTMLDialogElement): void {
  this.removeAttribute('open');
  this.dispatchEvent(new Event('close'));
};

globalThis.ResizeObserver ??= class {
  observe = (): undefined => undefined;
  unobserve = (): undefined => undefined;
  disconnect = (): undefined => undefined;
};

Element.prototype.animate ??= function (): Animation {
  return { cancel: (): undefined => undefined } as unknown as Animation;
};

// Angular turns animate.enter and animate.leave on when the root element has getAnimations: keep it off there.
Element.prototype.getAnimations ??= (): Animation[] => [];
Object.defineProperty(document.documentElement, 'getAnimations', { value: undefined, configurable: true });

import { Injectable, inject } from '@angular/core';
import type { ActivatedRouteSnapshot, ViewTransitionInfo } from '@angular/router';

import { injectReducedMotion } from '@joanroucoux/cairn-ui/motion';

import { SHELL_DESTINATIONS } from '@core/shell/shell-nav';

import { injectDesktop } from '@shared/layout/desktop-media';

const SHELL_PATHS = new Set(SHELL_DESTINATIONS.map((destination) => destination.path));

const pathOf = (root: ActivatedRouteSnapshot): string => {
  let leaf = root;

  while (leaf.firstChild) {
    leaf = leaf.firstChild;
  }

  return `/${leaf.pathFromRoot.flatMap((segment) => segment.url.map((part) => part.path)).join('/')}`;
};

const inHoldings = (path: string): boolean => path === '/holdings' || path.startsWith('/holdings/');

@Injectable({ providedIn: 'root' })
class ViewTransitionPolicy {
  readonly #reduced = injectReducedMotion();
  readonly #desktop = injectDesktop();

  skips(from: ActivatedRouteSnapshot, to: ActivatedRouteSnapshot): boolean {
    const fromPath = pathOf(from);
    const toPath = pathOf(to);

    return (
      this.#reduced() ||
      fromPath === toPath ||
      (SHELL_PATHS.has(fromPath) && SHELL_PATHS.has(toPath)) ||
      (this.#desktop() && inHoldings(fromPath) && inHoldings(toPath))
    );
  }
}

export const onViewTransitionCreated = ({ transition, from, to }: ViewTransitionInfo): void => {
  if (inject(ViewTransitionPolicy).skips(from, to)) {
    transition.ready.then(
      () => transition.skipTransition(),
      () => undefined,
    );
  }
};

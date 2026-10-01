import { Directive, ElementRef, afterNextRender, inject } from '@angular/core';

@Directive({ selector: '[appFocusOnInit]' })
export class FocusOnInit {
  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

    afterNextRender(() => element.focus({ preventScroll: true }));
  }
}

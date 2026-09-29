import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PageLoad } from './page-load';

describe('PageLoad', () => {
  it('should leave the application and load the given path in place of the current history entry', () => {
    const replace = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: { defaultView: { location: { replace } } } }],
    });

    TestBed.inject(PageLoad).to('/');

    expect(replace).toHaveBeenCalledWith('/');
  });

  it('should do nothing where there is no window, rather than throw', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: {} }],
    });

    expect(() => TestBed.inject(PageLoad).to('/')).not.toThrow();
  });
});

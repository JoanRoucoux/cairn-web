import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, RouterOutlet } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';
import { fireEvent, render, screen } from '@testing-library/angular';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingChanges } from '../holding-changes';
import { HoldingDetailPage } from './holding-detail-page';

@Component({ selector: 'app-test-host', imports: [RouterOutlet], template: '<router-outlet />' })
class TestHost {}

@Component({ selector: 'app-stub-list', template: 'list' })
class StubList {}

const holding = {
  id: 'h1',
  instrumentId: 'i1',
  instrumentName: 'BNP Paribas Easy S&P 500',
  accountName: 'Northwind PEA',
  accountType: 'PEA',
  assetClass: 'ETF',
  quantity: 676,
  price: 33.3069,
  marketValueEur: 22515.47,
  stale: false,
};

describe('HoldingDetailPage navigation', () => {
  let httpTesting: HttpTestingController;

  const settle = async (): Promise<void> => {
    for (let i = 0; i < 10; i++) {
      TestBed.tick();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  };

  const open = async (from: string[], initialRoute = 'holdings/h1'): Promise<HoldingDetailPage> => {
    const { fixture } = await render(TestHost, {
      imports: [getTranslocoTestingModule()],
      routes: [
        { path: 'holdings', component: StubList },
        { path: 'other', component: StubList },
        { path: 'holdings/:holdingId', component: HoldingDetailPage },
      ],
      initialRoute: from[0] ?? initialRoute,
      providers: [
        HoldingChanges,
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'en-GB' },
        provideTranslocoScope('holdings'),
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);

    if (from.length) {
      await TestBed.inject(Router).navigateByUrl(initialRoute);
    }

    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings'))).flush([holding]);
    await settle();
    httpTesting.match((request) => request.url.includes('/quotes')).forEach((request) => request.flush([]));
    await settle();

    return fixture.debugElement.query(By.directive(HoldingDetailPage)).componentInstance as HoldingDetailPage;
  };

  afterEach(() => {
    httpTesting.verify();
    vi.unstubAllGlobals();
  });

  it('goes back in the history when the list is the previous entry, so it returns to where it was left', async () => {
    await open(['holdings']);
    const back = vi.spyOn(TestBed.inject(Location), 'back').mockImplementation(() => undefined);

    (await screen.findByTestId('holding-detail-back')).click();

    expect(back).toHaveBeenCalledOnce();
    expect(TestBed.inject(Router).url).toBe('/holdings/h1');
  });

  it('navigates to the list when the line was opened directly', async () => {
    await open([]);
    const back = vi.spyOn(TestBed.inject(Location), 'back');

    (await screen.findByTestId('holding-detail-back')).click();

    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/holdings'));
    expect(back).not.toHaveBeenCalled();
  });

  it('navigates to the list when another page is the previous entry', async () => {
    await open(['other']);
    const back = vi.spyOn(TestBed.inject(Location), 'back');

    (await screen.findByTestId('holding-detail-back')).click();

    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/holdings'));
    expect(back).not.toHaveBeenCalled();
  });

  it.each([{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }])(
    'leaves a modified click %j to the browser',
    async (modifier) => {
      await open(['holdings']);
      const back = vi.spyOn(TestBed.inject(Location), 'back').mockImplementation(() => undefined);

      const link = await screen.findByTestId('holding-detail-back');
      let handled = true;

      link.addEventListener('click', (event) => {
        handled = event.defaultPrevented;
        event.preventDefault();
      });
      fireEvent.click(link, modifier);

      expect(handled).toBe(false);
      expect(back).not.toHaveBeenCalled();
    },
  );

  it('keeps the list filter in the back link', async () => {
    await open([], 'holdings/h1?classe=etf');

    expect(await screen.findByTestId('holding-detail-back')).toHaveAttribute('href', '/holdings?classe=etf');
  });

  it('slides in and fades out beside the list on desktop', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query === '(min-width: 1024px)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    const page = await open([]);

    expect(page['panelEnter']()).toBe('ui-enter-panel');
    expect(page['panelLeave']()).toBe('ui-leave-fade');
  });

  it('plays no panel motion on a phone, where the page cross-fades instead', async () => {
    const page = await open([]);

    expect(page['panelEnter']()).toBeNull();
    expect(page['panelLeave']()).toBeNull();
  });
});

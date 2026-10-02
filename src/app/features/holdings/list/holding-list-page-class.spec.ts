import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, Component, LOCALE_ID, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type Event, NavigationEnd, Router, RouterOutlet, Scroll } from '@angular/router';

import { UI_AMOUNT_MASKED } from '@joanroucoux/cairn-ui';
import { TRANSLOCO_LOADER, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { render, screen, within } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { type Subject, map, timer } from 'rxjs';

import { RatioPipe } from '@shared/format/ratio-pipe';
import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingChanges } from '../holding-changes';
import { HoldingListPage } from './holding-list-page';

@Component({ selector: 'app-test-host', imports: [RouterOutlet], template: '<router-outlet />' })
class TestHost {}

const accounts = [
  { id: 'a1', name: 'Saxo Investor', type: 'PEA', institution: 'Saxo' },
  { id: 'a2', name: 'Esalia', type: 'PEE', institution: 'Amundi ESR' },
];

const line = (id: string, accountId: string, assetClass: string, name: string, value: number): unknown => ({
  id,
  accountId,
  accountName: accountId === 'a1' ? 'Saxo Investor' : 'Esalia',
  accountType: accountId === 'a1' ? 'PEA' : 'PEE',
  instrumentName: name,
  isin: `ISIN${id}`,
  assetClass,
  quantity: 1,
  price: value,
  marketValueEur: value,
  stale: false,
});

const holdings = [
  line('h1', 'a1', 'ETF', 'Amundi MSCI World', 1000),
  line('h2', 'a1', 'ETF', 'iShares Core S&P 500', 3000),
  line('h3', 'a2', 'FUND', 'FCPE Actions', 2000),
];

const translations = {
  en: { enums: { assetClass: { ETF: 'ETF', FUND: 'Funds', EQUITY: 'Stocks', CRYPTO: 'Crypto', CASH: 'Cash' } } },
  'holdings/en': {
    classFilter: { label: 'Filter by class', all: 'All' },
    classSummary: {
      share_one: '· {{share}} of wealth, in {{count}} account',
      share_other: '· {{share}} of wealth, in {{count}} accounts',
    },
    noResultsInClass: 'Nothing matches "{{query}}" in {{class}}',
    noClassResults: 'Nothing in {{class}}',
    noClassHint: 'Remove the {{class}} filter.',
    noSearchResults: 'Nothing matches "{{query}}"',
  },
};

describe('HoldingListPage class filter', () => {
  let httpTesting: HttpTestingController;
  const masked = signal(false);

  const open = async (initialRoute = '/', flush = true, scopeDelay = 0): Promise<void> => {
    await render(TestHost, {
      imports: [getTranslocoTestingModule({ langs: { ...translations, fr: {}, 'holdings/fr': {} } })],
      routes: [{ path: '', component: HoldingListPage }],
      initialRoute,
      providers: [
        HoldingChanges,
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        RatioPipe,
        { provide: LOCALE_ID, useValue: 'en-GB' },
        { provide: UI_AMOUNT_MASKED, useValue: masked },
        provideTranslocoScope('holdings'),
        ...(scopeDelay
          ? [
              {
                provide: TRANSLOCO_LOADER,
                useValue: {
                  getTranslation: (lang: string) =>
                    timer(lang.includes('/') ? scopeDelay : 0).pipe(
                      map(() => (translations as Record<string, object>)[lang] ?? {}),
                    ),
                },
              },
            ]
          : []),
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);

    if (flush) {
      httpTesting.expectOne('/api/holdings').flush(holdings);
      httpTesting.expectOne('/api/accounts').flush(accounts);
    }
  };

  const chip = (name: RegExp | string): HTMLElement => screen.getByRole('button', { name });

  beforeEach(() => masked.set(false));

  afterEach(() => {
    httpTesting.verify();
    vi.restoreAllMocks();
  });

  it('should draw the chips under the search with their counts, Toutes pressed', async () => {
    await open();

    expect(await screen.findByRole('group', { name: 'Filter by class' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /^All\s*5$/ })).toHaveAttribute('aria-pressed', 'true');
    expect(chip(/^ETF\s*2$/)).toHaveAttribute('aria-pressed', 'false');
    expect(chip(/^Funds\s*1$/)).toBeInTheDocument();
    expect(chip(/^Stocks\s*0$/)).toBeInTheDocument();
    expect(chip(/^Cash\s*2$/)).toBeInTheDocument();
  });

  it('should never draw a raw translation key on a chip while the scope loads', async () => {
    await open('/', true, 300);

    expect(await screen.findByRole('button', { name: /^ETF/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /holdings.classFilter/ })).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /^All/ })).toBeInTheDocument();
  });

  it('should keep the chip labels while loading and add the counts when the data arrives', async () => {
    await open('/', false);

    expect(await screen.findByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ETF' })).toBeInTheDocument();

    httpTesting.expectOne('/api/holdings').flush(holdings);
    httpTesting.expectOne('/api/accounts').flush(accounts);

    expect(await screen.findByRole('button', { name: /^ETF\s*2$/ })).toBeInTheDocument();
  });

  it('should keep the chip labels when the holdings fail to load', async () => {
    await open('/', false);
    httpTesting.expectOne('/api/holdings').flush(null, { status: 500, statusText: 'Server Error' });
    httpTesting.expectOne('/api/accounts').flush(accounts);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ETF' })).toBeInTheDocument();
  });

  it('should narrow the list to the clicked class and summarise it', async () => {
    const user = userEvent.setup();
    await open();
    await screen.findAllByText('Esalia');

    await user.click(chip(/^ETF/));

    await vi.waitFor(() => expect(screen.queryByText('Esalia')).not.toBeInTheDocument());

    expect(chip(/^ETF/)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('class-summary')).toHaveTextContent('ETF · €4,000.00 · 66.7% of wealth, in 1 account');
  });

  it('should write the slug of the clicked class to the URL, and drop it with Toutes', async () => {
    const user = userEvent.setup();
    await open();
    await screen.findAllByText('Esalia');
    const router = TestBed.inject(Router);

    await user.click(chip(/^Funds/));

    await vi.waitFor(() => expect(router.url).toBe('/?classe=fonds'));

    await user.click(chip(/^All/));

    await vi.waitFor(() => expect(router.url).toBe('/'));
  });

  it('should not ask for the all label before the holdings scope has loaded', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const translate = vi.spyOn(TranslocoService.prototype, 'translate');
    await open('/', true, 300);

    expect(await screen.findByRole('button', { name: /^All/ })).toBeInTheDocument();
    expect(translate).not.toHaveBeenCalledWith('holdings.classFilter.all');
    expect(warn).not.toHaveBeenCalled();
  });

  it('should go back to every account with Toutes', async () => {
    const user = userEvent.setup();
    await open('/?classe=etf');
    await screen.findAllByText('Saxo Investor');

    await user.click(chip(/^All/));

    await vi.waitFor(() => expect(screen.queryByTestId('class-summary')).not.toBeInTheDocument());

    expect((await screen.findAllByText('Esalia')).length).toBeGreaterThan(0);
  });

  it('should open filtered from ?classe=', async () => {
    await open('/?classe=fonds');

    expect(await screen.findByRole('button', { name: /^Funds/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Saxo Investor')).not.toBeInTheDocument();
  });

  it('should say accounts in the plural from two accounts on', async () => {
    await open('/?classe=liquidites');

    expect(await screen.findByTestId('class-summary')).toHaveTextContent('in 2 accounts');
  });

  it('should read zero accounts in the singular, as the mockup does', async () => {
    await open('/?classe=actions');

    expect(await screen.findByTestId('class-summary')).toHaveTextContent('in 0 account');
    expect(screen.getByTestId('class-summary')).not.toHaveTextContent('accounts');
  });

  it('should ignore an unknown ?classe=', async () => {
    await open('/?classe=bitcoin');

    expect(await screen.findByRole('button', { name: /^All/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('should mask the summary amount with the other amounts, not the share', async () => {
    masked.set(true);
    await open('/?classe=etf');
    const summary = await screen.findByTestId('class-summary');

    expect(summary).toHaveTextContent('ETF · €••••');
    expect(summary).toHaveTextContent('66.7%');
  });

  it('should show a skeleton in place of the summary while loading, and nothing on error', async () => {
    await open('/?classe=etf', false);

    expect(screen.queryByTestId('class-summary')).not.toBeInTheDocument();
    expect(await screen.findByTestId('holdings-loading-rows')).toBeInTheDocument();
    const [phone, desktop] = screen.getAllByTestId('summary-skeleton');
    expect(phone!.querySelectorAll('span')).toHaveLength(2);
    expect(desktop!.querySelectorAll('span')).toHaveLength(1);

    httpTesting.expectOne('/api/holdings').flush(null, { status: 500, statusText: 'Server Error' });
    httpTesting.expectOne('/api/accounts').flush(accounts);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByTestId('class-summary')).not.toBeInTheDocument();
  });

  it('should say nothing matches the search in the class, and how to widen it', async () => {
    const user = userEvent.setup();
    await open('/?classe=etf');
    await screen.findAllByText('Saxo Investor');

    await user.type(screen.getByTestId('holdings-search'), 'fcpe');

    expect(await screen.findByText('Nothing matches "fcpe" in ETF')).toBeInTheDocument();
    expect(screen.getByText('Remove the ETF filter.')).toBeInTheDocument();
  });

  it('should say there is no line in the class when nothing is searched', async () => {
    await open('/?classe=actions');

    expect(await screen.findByText('Nothing in Stocks')).toBeInTheDocument();
    expect(screen.getByText('Remove the Stocks filter.')).toBeInTheDocument();
  });

  it('should keep the plain search copy without a class', async () => {
    const user = userEvent.setup();
    await open();
    await screen.findAllByText('Saxo Investor');

    await user.type(screen.getByTestId('holdings-search'), 'zzz');

    expect(await screen.findByText('Nothing matches "zzz"')).toBeInTheDocument();
  });

  const routerScrolls = (): void =>
    (TestBed.inject(Router).events as Subject<Event>).next(new Scroll(new NavigationEnd(1, '/', '/'), null, null));

  describe('arriving on ?compte=', () => {
    const scrolled: Element[] = [];
    const animated: Element[] = [];
    const order: string[] = [];
    const animate = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')!;

    beforeEach(() => {
      scrolled.length = 0;
      animated.length = 0;
      order.length = 0;
      vi.spyOn(HTMLElement.prototype, 'offsetParent', 'get').mockReturnValue(document.body);
      Object.defineProperty(Element.prototype, 'scrollIntoView', {
        configurable: true,
        value: vi.fn(function (this: Element) {
          scrolled.push(this);
          order.push('scroll');
        }),
      });
      Object.defineProperty(Element.prototype, 'animate', {
        configurable: true,
        value: vi.fn(function (this: Element) {
          animated.push(this);
          order.push('highlight');

          return { cancel: vi.fn() };
        }),
      });
    });

    afterEach(() => {
      Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
      Object.defineProperty(Element.prototype, 'animate', animate);
    });

    it('should wait for the router to place the page before landing', async () => {
      await open('/?compte=a2');
      await screen.findAllByRole('heading', { name: 'Esalia' });

      expect(scrolled).toHaveLength(0);
      expect(animated).toHaveLength(0);
    });

    it('should place the group at once, focus its heading without scrolling, then highlight its header', async () => {
      const focus = vi.spyOn(HTMLElement.prototype, 'focus');
      const scrollTo = vi.spyOn(window, 'scrollTo');
      await open('/?compte=a2');
      const headings = await screen.findAllByRole('heading', { name: 'Esalia' });

      routerScrolls();

      await vi.waitFor(() => expect(headings).toContain(document.activeElement));
      expect(scrolled).toHaveLength(1);
      expect((scrolled[0] as HTMLElement).dataset['accountId']).toBe('a2');
      expect(scrollIntoViewArgs()).toEqual({ block: 'start', behavior: 'auto' });
      expect(focus).toHaveBeenCalledWith({ preventScroll: true });
      await vi.waitFor(() => expect(animated.length).toBeGreaterThan(0));
      expect(order[0]).toBe('scroll');
      expect(
        animated.every((element) => element.closest('[data-account-id]')?.getAttribute('data-account-id') === 'a2'),
      ).toBe(true);
      expect(scrollTo).not.toHaveBeenCalled();
      expect(screen.getAllByRole('heading', { name: 'Saxo Investor' }).length).toBeGreaterThan(0);
      expect(chip(/^All/)).toHaveAttribute('aria-pressed', 'true');
    });

    it('should not highlight the header again when a filter rebuilds the groups', async () => {
      const user = userEvent.setup();
      await open('/?compte=a2');
      await screen.findAllByRole('heading', { name: 'Esalia' });
      routerScrolls();
      await vi.waitFor(() => expect(animated.length).toBeGreaterThan(0));
      const played = animated.length;

      await user.click(chip(/^Funds/));
      await screen.findAllByRole('heading', { name: 'Esalia' });
      await user.click(chip(/^All/));
      await screen.findAllByRole('heading', { name: 'Saxo Investor' });

      expect(animated).toHaveLength(played);
    });

    it('should ignore a ?compte= that matches no account: no scroll, no focus, no highlight', async () => {
      await open('/?compte=nope');
      await screen.findAllByRole('heading', { name: 'Esalia' });
      routerScrolls();
      TestBed.tick();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(screen.getAllByRole('heading', { name: 'Esalia' }).length).toBeGreaterThan(0);
      expect(chip(/^All/)).toHaveAttribute('aria-pressed', 'true');
      expect(scrolled).toEqual([]);
      expect(animated).toEqual([]);
      expect(document.activeElement).toBe(document.body);
      expect(within(document.body).queryByRole('alert')).not.toBeInTheDocument();
    });

    const scrollIntoViewArgs = (): unknown =>
      (Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
  });
});

import { type Page, type Request, expect, test } from '@playwright/test';

import { mockApi } from './fixtures/api';
import { SHARED_ISIN } from './fixtures/search';

const searchesOf = (page: Page): Request[] => {
  const searches: Request[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/instruments/search')) {
      searches.push(request);
    }
  });

  return searches;
};

const sourceOf = (request: Request): string | null => new URL(request.url()).searchParams.get('source');

const createdLine = (page: Page): Promise<Request> =>
  page.waitForRequest((request) => request.method() === 'POST' && request.url().endsWith('/api/holdings'));

const openDialog = async (page: Page): Promise<void> => {
  await page.getByTestId('add-holding-desktop').click();
  await expect(page.getByTestId('holding-add-dialog').locator('dialog')).toBeVisible();
};

test.describe('add a line', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await page.goto('/holdings');
    await openDialog(page);
  });

  test('searches Yahoo Finance and CoinGecko for a name, tracked titles first, and creates a found title', async ({
    page,
  }) => {
    const searches = searchesOf(page);
    await expect(page.getByTestId('holding-add-query')).toBeFocused();
    await expect(page.getByTestId('holding-add-query')).toHaveAttribute('placeholder', 'Name, symbol or ISIN');

    await page.getByTestId('holding-add-query').fill('msci');

    const results = page.getByTestId('holding-add-results');
    await expect(results.getByRole('group', { name: 'Already tracked, in your holdings' })).toBeVisible();
    await expect(results.getByTestId('holding-add-tracked-title')).toHaveText([
      /^\s*Amundi MSCI World/,
      /^\s*iShares Core MSCI World/,
    ]);
    await expect(results.getByRole('group')).toHaveCount(2);
    await expect(results.getByRole('group', { name: 'Yahoo Finance, live price' })).toBeVisible();
    await expect(results.getByTestId('holding-add-online-candidate')).toHaveCount(1);
    expect(searches.map(sourceOf).sort()).toEqual(['COINGECKO', 'YAHOO']);

    await results.getByTestId('holding-add-online-candidate').click();

    await expect(page.getByTestId('holding-add-picked')).toContainText('New');
    await expect(page.getByTestId('holding-add-source-line')).toHaveText(
      /Yahoo Finance\s+·\s+live price\s+·\s+trial €97\.91/,
    );
    await expect(page.getByTestId('holding-add-quantity')).toBeFocused();
    await page.getByTestId('holding-add-account').selectOption({ label: 'Contoso Trading · CTO' });
    await page.getByTestId('holding-add-quantity').fill('5');
    await expect(page.getByTestId('holding-add-value')).toHaveText(/Value at the trial price €489\.55/);
    await expect(page.getByTestId('holding-add-submit')).toHaveText('Create the instrument and add the holding');

    const created = createdLine(page);
    await page.getByTestId('holding-add-submit').click();

    expect((await created).postDataJSON()).toMatchObject({
      quantity: 5,
      instrument: { priceSource: 'YAHOO', sourceRef: 'IWDA.AS', currency: 'EUR' },
    });
    await expect(page.getByTestId('holding-add-dialog')).toHaveCount(0);
    await expect(page.getByTestId('holding-row').filter({ hasText: 'iShares Core MSCI World UCITS' })).toBeVisible();
  });

  test('shows a source still searching, then down with its own retry', async ({ page }) => {
    let calls = 0;
    const yahoo = (url: URL): boolean =>
      url.pathname.endsWith('/api/instruments/search') && url.searchParams.get('source') === 'YAHOO';
    await page.route(yahoo, async (route) => {
      calls += 1;

      if (calls === 1) {
        await new Promise((resolve) => setTimeout(resolve, 800));

        return route.fulfill({ status: 502, json: { title: 'Upstream dependency failed' } });
      }

      return route.fallback();
    });

    await page.getByTestId('holding-add-query').fill('msci');

    await expect(
      page.getByRole('group', { name: 'Yahoo Finance, live price' }).locator('[aria-busy="true"]'),
    ).toBeVisible();
    await expect(page.getByText('Yahoo Finance is not answering right now.')).toBeVisible();

    await page.getByRole('button', { name: 'Retry' }).click();

    await expect(page.getByTestId('holding-add-online-candidate')).toContainText('iShares Core MSCI World');
    expect(calls).toBe(2);
  });

  test('says when the chosen source has nothing, and searches every source again on demand', async ({ page }) => {
    const sources = page.getByRole('group', { name: 'Where to search' });

    await sources.getByRole('button', { name: 'CoinGecko' }).click();
    await expect(page.getByTestId('holding-add-help')).toHaveText('Cryptocurrencies. E.g. solana, SOL.');
    await page.getByTestId('holding-add-query').fill('zzz');

    await expect(page.getByText('No result from CoinGecko.')).toBeVisible();
    await page.getByTestId('holding-add-search-all').click();

    await expect(sources.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('holding-add-none-found')).toContainText('Nothing found for "zzz"');
  });

  test('never asks Amundi without a full ISIN', async ({ page }) => {
    const searches = searchesOf(page);

    await page.getByRole('group', { name: 'Where to search' }).getByRole('button', { name: 'Amundi' }).click();
    await page.getByTestId('holding-add-query').fill('northwind');

    await expect(page.getByText('Type a full 12-character ISIN: Amundi does not search by name.')).toBeVisible();
    expect(searches).toEqual([]);
  });

  test('finds one ISIN at Yahoo Finance and at Amundi, and adds both', async ({ page }) => {
    const searches = searchesOf(page);
    await page.getByTestId('holding-add-query').fill(SHARED_ISIN);

    const candidates = page.getByTestId('holding-add-online-candidate');
    await expect(candidates).toHaveCount(2);
    await expect(candidates.nth(0)).toContainText('Northwind World Equity UCITS ETF');
    await expect(candidates.nth(1)).toContainText(`${SHARED_ISIN} · NAV of 24/09`);
    expect(searches.map(sourceOf).sort()).toEqual(['AMUNDI', 'YAHOO']);

    await candidates.nth(0).click();
    await page.getByTestId('holding-add-quantity').fill('1');
    await page.getByTestId('holding-add-submit').click();
    await expect(page.getByTestId('holding-add-dialog')).toHaveCount(0);

    await openDialog(page);
    await page.getByTestId('holding-add-query').fill(SHARED_ISIN);
    await page.getByTestId('holding-add-online-candidate').filter({ hasText: 'Northwind World Equity Fund' }).click();
    await expect(page.getByTestId('holding-add-source-line')).toHaveText(
      /Amundi\s+·\s+net asset value of 24\/09\s+·\s+€527\.90/,
    );
    await page.getByTestId('holding-add-quantity').fill('2');

    const created = createdLine(page);
    await page.getByTestId('holding-add-submit').click();

    expect((await created).postDataJSON()).toMatchObject({ instrument: { priceSource: 'AMUNDI', isin: SHARED_ISIN } });
    await expect(page.getByTestId('holding-add-dialog')).toHaveCount(0);
    await expect(page.getByTestId('holding-row').filter({ hasText: 'Northwind World Equity' })).toHaveCount(2);
  });

  test('adds an SG Sirius product from its ISIN alone', async ({ page }) => {
    await page.getByTestId('holding-add-sirius-link').click();

    const isin = page.getByTestId('holding-add-sirius-isin');
    await expect(isin).toBeFocused();
    await expect(page.getByText('E.g. XS2381234567')).toBeVisible();
    await expect(page.getByTestId('holding-add-sirius-note')).toHaveText(
      'Cairn cannot check this ISIN before adding it. The price will arrive with the next SG Sirius statement; if the ISIN is wrong, the holding will stay without a price.',
    );

    await isin.pressSequentially('xs23');
    await expect(isin).toHaveValue('XS23');
    await expect(page.getByText('4 characters out of 12')).toBeVisible();

    await isin.fill('XS238123456X');
    await expect(page.getByText('This is not a valid ISIN: 2 letters, 9 characters, 1 digit.')).toBeVisible();
    await expect(page.getByTestId('holding-add-account')).toHaveCount(0);

    await isin.fill('XS2381234567');
    await expect(page.getByText('Valid format')).toBeVisible();
    await page.getByTestId('holding-add-quantity').fill('10');
    await expect(page.getByTestId('holding-add-value')).toHaveCount(0);
    await expect(page.getByTestId('holding-add-submit')).toHaveText('Add with this ISIN');

    const created = createdLine(page);
    await page.getByTestId('holding-add-submit').click();

    expect((await created).postDataJSON()).toMatchObject({
      instrument: { priceSource: 'SG_SIRIUS', assetClass: 'FUND', isin: 'XS2381234567' },
    });
    await expect(page.getByTestId('holding-add-dialog')).toHaveCount(0);
    await expect(page.getByTestId('holding-row').filter({ hasText: 'XS2381234567' })).toBeVisible();
  });

  test('adds a title by hand with its price', async ({ page }) => {
    await page.getByTestId('holding-add-manual-link').click();

    await expect(page.getByTestId('holding-add-manual-name')).toBeFocused();
    await expect(page.getByTestId('holding-add-manual-class')).toHaveValue('OTHER');
    await page.getByTestId('holding-add-manual-name').fill('Northwind Private Equity');
    await page.getByTestId('holding-add-manual-class').selectOption('BOND');
    await page.getByTestId('holding-add-manual-price').fill('1135');
    await page.getByTestId('holding-add-quantity').fill('8');

    await expect(page.getByTestId('holding-add-value')).toHaveText(/Value at the entered price €9,080\.00/);
    await expect(page.getByTestId('holding-add-submit')).toHaveText('Create the instrument and add the holding');

    const created = createdLine(page);
    await page.getByTestId('holding-add-submit').click();

    expect((await created).postDataJSON()).toMatchObject({
      instrument: { priceSource: 'MANUAL', name: 'Northwind Private Equity', assetClass: 'BOND', price: 1135 },
    });
    await expect(page.getByTestId('holding-add-dialog')).toHaveCount(0);
    await expect(page.getByTestId('holding-row').filter({ hasText: 'Northwind Private Equity' })).toContainText(
      'Bonds · Manual entry',
    );
  });

  test('refuses a title the account already holds', async ({ page }) => {
    let posted = false;
    page.on('request', (request) => {
      posted ||= request.method() === 'POST' && request.url().endsWith('/api/holdings');
    });

    await page.getByTestId('holding-add-query').fill('Amundi MSCI World');
    await page.getByTestId('holding-add-tracked-title').click();
    await expect(page.getByTestId('holding-add-submit')).toHaveText('Add the holding');
    await page.getByTestId('holding-add-account').selectOption({ label: 'Northwind PEA · PEA' });
    await page.getByTestId('holding-add-quantity').fill('3');
    await page.getByTestId('holding-add-quantity').press('Enter');

    await expect(page.getByTestId('holding-add-error')).toHaveText('This account already holds this instrument.');
    expect(posted).toBe(false);

    await page.getByTestId('holding-add-account').selectOption({ label: 'Contoso Trading · CTO' });
    await expect(page.getByTestId('holding-add-error')).toHaveCount(0);
    await page.getByTestId('holding-add-quantity').press('Enter');

    await expect(page.getByTestId('holding-add-dialog')).toHaveCount(0);
  });
});

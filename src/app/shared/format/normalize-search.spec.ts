import { normalizeSearch } from './normalize-search';

describe('normalizeSearch', () => {
  it('lowercases and strips accents', () => {
    expect(normalizeSearch('Société Générale')).toBe('societe generale');
  });

  it('leaves an already-normalized string unchanged', () => {
    expect(normalizeSearch('isin')).toBe('isin');
  });
});

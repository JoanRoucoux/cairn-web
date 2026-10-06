import { TestBed } from '@angular/core/testing';

import { FoldedAccounts } from './folded-accounts';

describe('FoldedAccounts', () => {
  const create = (): FoldedAccounts => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [FoldedAccounts] });

    return TestBed.inject(FoldedAccounts);
  };

  const stored = (): unknown => JSON.parse(localStorage.getItem('cairn-folded-accounts') ?? 'null');

  beforeEach(() => localStorage.clear());

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('should start with nothing folded and write nothing', () => {
    const folded = create();

    expect(folded.isFolded('a1')).toBe(false);
    expect(stored()).toBeNull();
  });

  it('should remember a folded account as a JSON array of ids, and forget it once reopened', () => {
    const folded = create();

    folded.setFolded('a1', true);
    folded.setFolded('a2', true);
    expect(stored()).toEqual(['a1', 'a2']);
    expect(create().isFolded('a2')).toBe(true);

    folded.setFolded('a1', false);
    expect(stored()).toEqual(['a2']);
  });

  it('should write nothing when the state does not change', () => {
    const folded = create();
    const write = vi.spyOn(Storage.prototype, 'setItem');

    folded.setFolded('a1', false);

    expect(write).not.toHaveBeenCalled();
  });

  it('should keep only the ids of existing accounts, and write only when it drops one', () => {
    localStorage.setItem('cairn-folded-accounts', JSON.stringify(['a1', 'gone', 7]));
    const folded = create();
    const write = vi.spyOn(Storage.prototype, 'setItem');

    folded.prune(['a1', 'a2']);
    expect(stored()).toEqual(['a1']);

    folded.prune(['a1']);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('should read garbage or a non-array as nothing folded', () => {
    localStorage.setItem('cairn-folded-accounts', '{oops');
    expect(create().isFolded('a1')).toBe(false);

    localStorage.setItem('cairn-folded-accounts', '{"a1":true}');
    expect(create().isFolded('a1')).toBe(false);
  });

  it('should keep working in memory when the storage refuses to write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const folded = create();

    folded.setFolded('a1', true);

    expect(folded.isFolded('a1')).toBe(true);
  });
});

import { UpperFirstPipe } from './upper-first-pipe';

describe('UpperFirstPipe', () => {
  const pipe = new UpperFirstPipe();

  it('should capitalise the first letter and leave the rest alone', () => {
    expect(pipe.transform('hors 1 ligne sans cours')).toBe('Hors 1 ligne sans cours');
  });

  it('should return an empty string for an empty string', () => {
    expect(pipe.transform('')).toBe('');
  });
});

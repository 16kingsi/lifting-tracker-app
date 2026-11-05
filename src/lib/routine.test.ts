import { describe, expect, it } from 'vitest';
import { moveItem, nameProblem } from './routine';

describe('moveItem', () => {
  it('swaps an item with its neighbour', () => {
    expect(moveItem(['a', 'b', 'c'], 1, 0)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b', 'c'], 1, 2)).toEqual(['a', 'c', 'b']);
  });

  it('changes nothing when moving past either end', () => {
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], 1, 2)).toEqual(['a', 'b']);
  });
});

describe('nameProblem', () => {
  it('accepts a new name', () => {
    expect(nameProblem('Front Squat', ['back squat'])).toBeNull();
  });

  it('rejects an empty name', () => {
    expect(nameProblem('   ', [])).toBe('Enter a name.');
  });

  it('rejects a name that is taken, ignoring case and spaces', () => {
    expect(nameProblem(' Back SQUAT ', ['back squat'])).toBe('Another exercise already has this name.');
  });
});

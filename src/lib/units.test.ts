import { describe, expect, it } from 'vitest';
import { convertForEntry, formatLb, stepFor, stepWeight, toLb } from './units';

describe('toLb', () => {
  it('leaves pounds unchanged', () => {
    expect(toLb(95, 'lb')).toBe(95);
  });

  it('converts kilograms without rounding', () => {
    expect(toLb(100, 'kg')).toBeCloseTo(220.462262, 6);
  });

  it('handles zero', () => {
    expect(toLb(0, 'kg')).toBe(0);
  });
});

describe('formatLb', () => {
  it('rounds to one decimal place for display', () => {
    expect(formatLb(toLb(20, 'kg'))).toBe('44.1');
    expect(formatLb(toLb(38.5, 'kg'))).toBe('84.9');
    expect(formatLb(toLb(42.5, 'kg'))).toBe('93.7');
  });

  it('drops a trailing .0', () => {
    expect(formatLb(95)).toBe('95');
  });
});

describe('stepFor', () => {
  it('uses 5 lb and 2.5 kg', () => {
    expect(stepFor('lb')).toBe(5);
    expect(stepFor('kg')).toBe(2.5);
  });
});

describe('stepWeight', () => {
  it('steps up and down by the unit step', () => {
    expect(stepWeight(95, 'lb', 1)).toBe(100);
    expect(stepWeight(95, 'lb', -1)).toBe(90);
    expect(stepWeight(20, 'kg', 1)).toBe(22.5);
  });

  it('never goes below zero', () => {
    expect(stepWeight(2.5, 'lb', -1)).toBe(0);
    expect(stepWeight(0, 'kg', -1)).toBe(0);
  });

  it('keeps a typed weight that is not a multiple of the step', () => {
    expect(stepWeight(42.25, 'kg', 1)).toBe(44.75);
  });
});

describe('convertForEntry', () => {
  it('returns the same value when the unit does not change', () => {
    expect(convertForEntry(42.25, 'kg', 'kg')).toBe(42.25);
  });

  it('snaps to the nearest 2.5 kg', () => {
    expect(convertForEntry(95, 'lb', 'kg')).toBe(42.5);
    expect(convertForEntry(100, 'lb', 'kg')).toBe(45);
  });

  it('snaps to the nearest 5 lb', () => {
    expect(convertForEntry(42.5, 'kg', 'lb')).toBe(95);
    expect(convertForEntry(20, 'kg', 'lb')).toBe(45);
  });

  it('keeps zero at zero', () => {
    expect(convertForEntry(0, 'lb', 'kg')).toBe(0);
  });
});

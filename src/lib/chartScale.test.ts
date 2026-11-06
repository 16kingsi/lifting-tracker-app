import { describe, expect, it } from 'vitest';
import { niceScale } from './chartScale';

function covers(scale: { lo: number; hi: number }, min: number, max: number) {
  return scale.lo <= min && scale.hi >= max;
}

describe('niceScale', () => {
  it('uses round steps that cover the values', () => {
    const scale = niceScale(65, 95);
    expect(scale.ticks).toEqual([60, 70, 80, 90, 100]);
  });

  it('covers awkward ranges', () => {
    for (const [min, max] of [
      [84.9, 137.5],
      [0.5, 3],
      [301, 302],
      [995, 1005],
    ]) {
      const scale = niceScale(min, max);
      expect(covers(scale, min, max)).toBe(true);
      expect(scale.ticks.length).toBeGreaterThanOrEqual(5);
      expect(scale.ticks.length).toBeLessThanOrEqual(6);
    }
  });

  it('adds a gridline rather than doubling the step', () => {
    expect(niceScale(82.3, 120.3).ticks).toEqual([80, 90, 100, 110, 120, 130]);
  });

  it('gives a flat line room above and below', () => {
    const scale = niceScale(95, 95);
    expect(scale.lo).toBeLessThan(95);
    expect(scale.hi).toBeGreaterThan(95);
  });

  it('never goes below zero', () => {
    expect(niceScale(0, 0).lo).toBe(0);
    expect(niceScale(2, 3).lo).toBeGreaterThanOrEqual(0);
  });

  it('uses time-friendly steps for seconds', () => {
    const scale = niceScale(30, 75, 4, true);
    expect(scale.ticks).toEqual([30, 45, 60, 75, 90]);
  });
});

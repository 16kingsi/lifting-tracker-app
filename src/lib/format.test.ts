import { describe, expect, it } from 'vitest';
import type { LoggedSet, TimedSet, Unit, WeightSet } from '../types';
import { formatDate, formatDuration, formatLongDate, formatShortDate, summarizeSets } from './format';

const base = { id: 'x', sessionId: 's', exerciseId: 'e', order: 1, note: '', loggedAt: 0 };

function weight(reps: number, weightValue: number, weightUnit: Unit = 'lb'): WeightSet {
  return { ...base, kind: 'weight', reps, weightValue, weightUnit };
}

function timed(durationSec: number): TimedSet {
  return { ...base, kind: 'timed', durationSec };
}

describe('formatDuration', () => {
  it('formats minutes and seconds', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(45)).toBe('0:45');
    expect(formatDuration(1450)).toBe('24:10');
  });

  it('adds hours when needed', () => {
    expect(formatDuration(3850)).toBe('1:04:10');
  });

  it('ignores fractions and negative numbers', () => {
    expect(formatDuration(38.9)).toBe('0:38');
    expect(formatDuration(-5)).toBe('0:00');
  });
});

describe('dates', () => {
  const oct29 = new Date(2026, 9, 29, 18, 30).getTime();

  it('formats in the styles the screens use', () => {
    expect(formatDate(oct29)).toBe('Thu, Oct 29');
    expect(formatShortDate(oct29)).toBe('Oct 29');
    expect(formatLongDate(oct29)).toBe('Thursday, Oct 29');
  });
});

describe('summarizeSets', () => {
  it('returns nothing for no sets', () => {
    expect(summarizeSets([])).toBe('');
  });

  it('collapses identical sets', () => {
    expect(summarizeSets([weight(8, 95), weight(8, 95), weight(8, 95)])).toBe('3 × 8 @ 95 lb');
  });

  it('lists reps when only the reps differ', () => {
    expect(summarizeSets([weight(8, 90), weight(8, 90), weight(7, 90)])).toBe('8, 8, 7 @ 90 lb');
  });

  it('lists each set when the weights differ', () => {
    expect(summarizeSets([weight(8, 95), weight(6, 100)])).toBe('8 × 95 lb, 6 × 100 lb');
  });

  it('keeps each unit as entered', () => {
    expect(summarizeSets([weight(10, 22.5, 'kg'), weight(10, 22.5, 'kg')])).toBe('2 × 10 @ 22.5 kg');
    expect(summarizeSets([weight(8, 95), weight(6, 40, 'kg')])).toBe('8 × 95 lb, 6 × 40 kg');
  });

  it('summarizes timed sets', () => {
    expect(summarizeSets([timed(45), timed(45)])).toBe('2 × 0:45');
    expect(summarizeSets([timed(45), timed(30)])).toBe('0:45, 0:30');
  });

  it('copes with a mix of weighted and timed sets', () => {
    const mixed: LoggedSet[] = [weight(8, 95), timed(45)];
    expect(summarizeSets(mixed)).toBe('8 × 95 lb, 0:45');
  });
});

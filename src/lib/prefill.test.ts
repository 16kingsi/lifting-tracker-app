import { describe, expect, it } from 'vitest';
import type { TimedSet, Unit, WeightSet } from '../types';
import { prefill } from './prefill';

const base = { id: 'x', sessionId: 's', exerciseId: 'e', order: 1, note: 'old note', loggedAt: 0 };

function weight(reps: number, weightValue: number, weightUnit: Unit = 'lb'): WeightSet {
  return { ...base, kind: 'weight', reps, weightValue, weightUnit };
}

function timed(durationSec: number): TimedSet {
  return { ...base, kind: 'timed', durationSec };
}

const input: Parameters<typeof prefill>[0] = {
  exerciseType: 'weight',
  todaySets: [],
  lastTimeSets: [],
  defaultUnit: 'lb',
};

describe('prefill', () => {
  it('uses the default unit and starter values with no history', () => {
    expect(prefill({ ...input, defaultUnit: 'kg' })).toEqual({
      reps: 8,
      weight: 0,
      unit: 'kg',
      seconds: 30,
      note: '',
    });
  });

  it('fills the first set from the first set last time', () => {
    const draft = prefill({ ...input, lastTimeSets: [weight(8, 95), weight(6, 95)] });
    expect(draft).toMatchObject({ reps: 8, weight: 95, unit: 'lb' });
  });

  it('keeps the unit used last time, not the default', () => {
    const draft = prefill({ ...input, lastTimeSets: [weight(10, 22.5, 'kg')] });
    expect(draft).toMatchObject({ weight: 22.5, unit: 'kg' });
  });

  it('copies the set just logged today once there is one', () => {
    const draft = prefill({
      ...input,
      todaySets: [weight(8, 100), weight(7, 105)],
      lastTimeSets: [weight(8, 95)],
    });
    expect(draft).toMatchObject({ reps: 7, weight: 105 });
  });

  it('fills timed exercises with a duration', () => {
    const plank = { ...input, exerciseType: 'timed' as const };
    expect(prefill({ ...plank, lastTimeSets: [timed(45)] }).seconds).toBe(45);
    expect(prefill({ ...plank, todaySets: [timed(50)], lastTimeSets: [timed(45)] }).seconds).toBe(50);
  });

  it('ignores old sets of the other type if the exercise type was changed', () => {
    const draft = prefill({ ...input, exerciseType: 'timed', lastTimeSets: [weight(8, 95)] });
    expect(draft.seconds).toBe(30);
  });

  it('never copies a note to the next set', () => {
    expect(prefill({ ...input, lastTimeSets: [weight(8, 95)] }).note).toBe('');
  });
});

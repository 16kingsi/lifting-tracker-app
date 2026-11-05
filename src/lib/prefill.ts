import type { Draft, ExerciseType, LoggedSet, Unit } from '../types';

interface PrefillInput {
  exerciseType: ExerciseType;
  todaySets: LoggedSet[]; // this exercise's sets so far today, in order
  lastTimeSets: LoggedSet[]; // this exercise's sets from the last completed workout
  defaultUnit: Unit;
}

// What the entry panel starts with for the next set. Following the mockup:
// repeat the set just logged today, otherwise use the first set from last time.
export function prefill({ exerciseType, todaySets, lastTimeSets, defaultUnit }: PrefillInput): Draft {
  const draft: Draft = { reps: 8, weight: 0, unit: defaultUnit, seconds: 30, note: '' };

  const matching = (s: LoggedSet) => s.kind === exerciseType;
  const source = todaySets.filter(matching).at(-1) ?? lastTimeSets.find(matching);

  if (source?.kind === 'weight') {
    draft.reps = source.reps;
    draft.weight = source.weightValue;
    draft.unit = source.weightUnit;
  } else if (source?.kind === 'timed') {
    draft.seconds = source.durationSec;
  }
  return draft;
}

// The entry panel's values for changing a set that's already logged. Fields the set
// doesn't use keep their values from `base`.
export function draftFromSet(set: LoggedSet, base: Draft): Draft {
  return set.kind === 'weight'
    ? { ...base, reps: set.reps, weight: set.weightValue, unit: set.weightUnit, note: set.note }
    : { ...base, seconds: set.durationSec, note: set.note };
}

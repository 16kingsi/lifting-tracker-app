import type { LoggedSet, Session } from '../types';

export interface ExerciseGroup {
  exerciseId: string;
  sets: LoggedSet[]; // in the order they were logged, empty if none were
}

// Splits a workout's sets up by exercise, in the workout's order. Planned exercises
// with no sets are included, so a forgotten one can still be filled in later.
export function groupSets(session: Session, sets: LoggedSet[]): ExerciseGroup[] {
  const ids = [...new Set([...session.items.map((i) => i.exerciseId), ...sets.map((s) => s.exerciseId)])];
  return ids.map((exerciseId) => ({
    exerciseId,
    sets: sets.filter((s) => s.exerciseId === exerciseId).sort((a, b) => a.order - b.order),
  }));
}

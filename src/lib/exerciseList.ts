// One line of facts about each exercise, for the Exercises page in History.
import type { Exercise, LoggedSet, Session, Template, TemplateId } from '../types';
import { formatValue, METRIC_NAMES, metricsFor, progressPoints } from './progress';

export interface ExerciseSummary {
  exercise: Exercise;
  workouts: number; // finished workouts it was logged in
  lastDate: number | null; // when it was last logged in a finished workout
  best: string | null; // "Top set 135 lb", "Longest hold 1:15", "Most reps 20"
  days: TemplateId[]; // the routine days it's part of
  inActiveWorkout: boolean;
  canDelete: boolean; // never logged and not used anywhere, so deleting loses nothing
}

export function summarizeExercises(
  exercises: Exercise[],
  sessions: Session[],
  sets: LoggedSet[],
  templates: Template[],
): ExerciseSummary[] {
  const finished = sessions.filter((s) => s.finishedAt !== null);
  const active = sessions.find((s) => s.finishedAt === null);

  return exercises.map((exercise) => {
    const own = sets.filter((s) => s.exerciseId === exercise.id);
    const metric = metricsFor(exercise.type, own)[0];
    const points = progressPoints(finished, own, metric);
    const bestValue = points.length ? Math.max(...points.map((p) => p.value)) : null;
    let best: string | null = null;
    if (bestValue !== null) {
      const { number, unit } = formatValue(metric, bestValue);
      // "Most reps 12", not "Most reps 12 reps"
      best = `${METRIC_NAMES[metric].label} ${number}${unit && metric !== 'reps' ? ` ${unit}` : ''}`;
    }

    const days = templates.filter((t) => t.items.some((i) => i.exerciseId === exercise.id)).map((t) => t.id);
    const inActiveWorkout =
      !!active && (active.items.some((i) => i.exerciseId === exercise.id) || own.some((s) => s.sessionId === active.id));
    const loggedIn = new Set(points.map((p) => p.sessionId));

    return {
      exercise,
      workouts: loggedIn.size,
      lastDate: points.length ? points[points.length - 1].date : null,
      best,
      days: days.sort(),
      inActiveWorkout,
      canDelete: own.length === 0 && days.length === 0 && !inActiveWorkout,
    };
  });
}

// The numbers behind the progress chart. Weights are compared in pounds (see units.ts).
import type { ExerciseType, LoggedSet, Session } from '../types';
import { formatDuration } from './format';
import { formatLb, toLb } from './units';

// top: heaviest set. e1rm: estimated one-rep max. reps: most reps, for exercises
// done without added weight. hold: longest hold, for timed exercises.
export type Metric = 'top' | 'e1rm' | 'reps' | 'hold';

export const METRIC_NAMES: Record<Metric, { button: string; label: string }> = {
  top: { button: 'Top set weight', label: 'Top set' },
  e1rm: { button: 'Est. 1-rep max', label: 'Estimated 1RM' },
  reps: { button: 'Most reps', label: 'Most reps' },
  hold: { button: 'Longest hold', label: 'Longest hold' },
};

export function metricsFor(type: ExerciseType, sets: LoggedSet[]): Metric[] {
  if (type === 'timed') return ['hold'];
  const weighted = sets.filter((s) => s.kind === 'weight');
  const anyWeight = weighted.length === 0 || weighted.some((s) => s.weightValue > 0);
  return anyWeight ? ['top', 'e1rm'] : ['reps'];
}

// The Epley formula. A single rep is its own one-rep max.
export function estimateOneRepMax(lb: number, reps: number): number {
  return reps <= 1 ? lb : lb * (1 + reps / 30);
}

// One set's value for a metric, or null if the set doesn't count towards it.
function setValue(set: LoggedSet, metric: Metric): number | null {
  if (metric === 'hold') return set.kind === 'timed' ? set.durationSec : null;
  if (set.kind !== 'weight') return null;
  if (metric === 'reps') return set.reps;
  const lb = toLb(set.weightValue, set.weightUnit);
  return metric === 'top' ? lb : estimateOneRepMax(lb, set.reps);
}

export interface ProgressPoint {
  sessionId: string;
  date: number;
  value: number;
  loggedInKg: boolean; // the set behind this point was entered in kg
}

// One point per finished workout, oldest first: the best set that day.
export function progressPoints(sessions: Session[], sets: LoggedSet[], metric: Metric): ProgressPoint[] {
  const points: ProgressPoint[] = [];
  for (const session of sessions) {
    if (session.finishedAt === null) continue;
    let best: { value: number; set: LoggedSet } | null = null;
    for (const set of sets) {
      if (set.sessionId !== session.id) continue;
      const value = setValue(set, metric);
      if (value !== null && (best === null || value > best.value)) best = { value, set };
    }
    if (best) {
      points.push({
        sessionId: session.id,
        date: session.finishedAt,
        value: best.value,
        loggedInKg: best.set.kind === 'weight' && best.set.weightUnit === 'kg',
      });
    }
  }
  return points.sort((a, b) => a.date - b.date);
}

export type Range = '1M' | '3M' | 'All';
const RANGE_DAYS: Record<Range, number> = { '1M': 31, '3M': 92, All: Infinity };

export function pointsInRange(points: ProgressPoint[], range: Range, now: number): ProgressPoint[] {
  const cutoff = now - RANGE_DAYS[range] * 86400000;
  return points.filter((p) => p.date >= cutoff);
}

// A value as a number and its unit: "137.5" "lb", "12" "reps", "1:05" "".
export function formatValue(metric: Metric, value: number): { number: string; unit: string } {
  if (metric === 'hold') return { number: formatDuration(value), unit: '' };
  if (metric === 'reps') return { number: String(value), unit: value === 1 ? 'rep' : 'reps' };
  if (metric === 'e1rm') return { number: String(Math.round(value)), unit: 'lb' };
  return { number: formatLb(value), unit: 'lb' };
}

// "+30 lb", "−5 lb", "+0:15", or null when nothing changed.
export function formatChange(metric: Metric, from: number, to: number): string | null {
  const diff = metric === 'e1rm' ? Math.round(to) - Math.round(from) : to - from;
  if (Math.abs(diff) < 0.05) return null;
  const sign = diff > 0 ? '+' : '−';
  const { number, unit } = formatValue(metric, Math.abs(diff));
  return `${sign}${number}${unit ? ` ${unit}` : ''}`;
}

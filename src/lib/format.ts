import type { LoggedSet } from '../types';

// 45 becomes "0:45". 3850 becomes "1:04:10".
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

// "Thu, Oct 29"
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// "Oct 29"
export function formatShortDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// "Tuesday, Nov 3"
export function formatLongDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

// "October 2026"
export function formatMonth(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// "1 set", "12 sets"
export function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

// A single set: "8 × 95 lb" or "0:45"
export function formatSet(set: LoggedSet): string {
  return set.kind === 'timed'
    ? formatDuration(set.durationSec)
    : `${set.reps} × ${set.weightValue} ${set.weightUnit}`;
}

// One line describing a group of sets, for "Last time":
// "3 × 8 @ 95 lb", "8, 8, 7 @ 90 lb", "8 × 95 lb, 6 × 40 kg", "2 × 0:45"
export function summarizeSets(sets: LoggedSet[]): string {
  if (sets.length === 0) return '';

  const timed = sets.filter((s) => s.kind === 'timed');
  const weighted = sets.filter((s) => s.kind === 'weight');

  if (timed.length === sets.length) {
    const times = timed.map((s) => formatDuration(s.durationSec));
    return allSame(times) ? `${times.length} × ${times[0]}` : times.join(', ');
  }

  if (weighted.length === sets.length) {
    const loads = weighted.map((s) => `${s.weightValue} ${s.weightUnit}`);
    const reps = weighted.map((s) => s.reps);
    if (allSame(loads)) {
      return allSame(reps)
        ? `${reps.length} × ${reps[0]} @ ${loads[0]}`
        : `${reps.join(', ')} @ ${loads[0]}`;
    }
    return weighted.map((s, i) => `${s.reps} × ${loads[i]}`).join(', ');
  }

  // Only possible if an exercise's type was changed partway through a workout.
  return sets.map(formatSet).join(', ');
}

function allSame<T>(values: T[]): boolean {
  return values.every((value) => value === values[0]);
}

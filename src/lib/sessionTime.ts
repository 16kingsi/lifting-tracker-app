import type { Session } from '../types';

// How long a workout has been going. Time between finishing a workout and reopening
// it doesn't count, even if that was weeks.
export function elapsedMs(session: Session, now: number): number {
  const { startedAt, reopened } = session;
  if (!reopened) return now - startedAt;
  return reopened.previousFinishedAt - startedAt + (now - reopened.at);
}

// The finish time to store. A reopened workout keeps its original date, moved on only
// by the time spent on it since reopening, so it stays in the same place in history
// and doesn't change which day is suggested next.
export function finishTime(session: Session, now: number): number {
  const { reopened } = session;
  if (!reopened) return now;
  return reopened.previousFinishedAt + (now - reopened.at);
}

export function durationMinutes(session: Session): number {
  return Math.round(((session.finishedAt ?? session.startedAt) - session.startedAt) / 60000);
}

import type { LoggedSet, Session } from '../types';

export interface LastTime {
  finishedAt: number;
  sets: LoggedSet[];
}

// Finds an exercise's sets from the most recent completed workout that included it.
// `sets` should be that exercise's sets. A workout still in progress never counts.
export function pickLastTime(sets: LoggedSet[], sessions: Session[]): LastTime | null {
  let latest: Session | null = null;
  for (const session of sessions) {
    if (session.finishedAt === null) continue;
    if (!sets.some((s) => s.sessionId === session.id)) continue;
    if (latest === null || session.finishedAt > (latest.finishedAt ?? 0)) latest = session;
  }
  if (latest === null || latest.finishedAt === null) return null;

  const latestId = latest.id;
  return {
    finishedAt: latest.finishedAt,
    sets: sets.filter((s) => s.sessionId === latestId).sort((a, b) => a.order - b.order),
  };
}

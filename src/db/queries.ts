// Functions that read from the database. Screens call these through useLiveQuery,
// which re-runs them whenever the data they read changes.
import { pickLastTime, type LastTime } from '../lib/lastTime';
import type { Exercise, LoggedSet, Session, Settings, Template } from '../types';
import { db } from './schema';

export async function getActiveSession(): Promise<Session | undefined> {
  return db.sessions.filter((s) => s.finishedAt === null).first();
}

export async function getSettings(): Promise<Settings> {
  return (await db.settings.get('settings'))!;
}

export interface ActiveWorkout {
  session: Session;
  exercisesById: Map<string, Exercise>;
  sets: LoggedSet[]; // every set logged so far in this workout, in order
  settings: Settings;
}

export async function loadActiveWorkout(): Promise<ActiveWorkout | null> {
  const session = await getActiveSession();
  if (!session) return null;

  const [exercises, sets, settings] = await Promise.all([
    db.exercises.toArray(),
    db.sets.where('sessionId').equals(session.id).toArray(),
    getSettings(),
  ]);

  return {
    session,
    exercisesById: new Map(exercises.map((e) => [e.id, e])),
    sets: sets.sort((a, b) => a.order - b.order),
    settings,
  };
}

// The sets from the most recent completed workout that included this exercise.
export async function getLastTime(exerciseId: string): Promise<LastTime | null> {
  const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray();
  const sessionIds = [...new Set(sets.map((s) => s.sessionId))];
  const sessions = await db.sessions.bulkGet(sessionIds);
  return pickLastTime(sets, sessions.filter((s) => s !== undefined));
}

export interface SwapOption {
  exercise: Exercise;
  lastTime: LastTime | null;
}

// Every exercise that isn't already in today's workout. Most recently used first,
// then the ones never logged, by name.
export async function getSwapOptions(excludeIds: string[]): Promise<SwapOption[]> {
  const [exercises, sets, sessions] = await Promise.all([
    db.exercises.toArray(),
    db.sets.toArray(),
    db.sessions.toArray(),
  ]);

  return exercises
    .filter((exercise) => !excludeIds.includes(exercise.id))
    .map((exercise) => ({
      exercise,
      lastTime: pickLastTime(
        sets.filter((s) => s.exerciseId === exercise.id),
        sessions,
      ),
    }))
    .sort(
      (a, b) =>
        (b.lastTime?.finishedAt ?? 0) - (a.lastTime?.finishedAt ?? 0) ||
        a.exercise.name.localeCompare(b.exercise.name),
    );
}

export interface HomeData {
  active: Session | null;
  activeSetCount: number;
  templates: Template[];
  exercisesById: Map<string, Exercise>;
  finished: Session[]; // completed workouts, newest first
}

export async function loadHome(): Promise<HomeData> {
  const [sessions, templates, exercises] = await Promise.all([
    db.sessions.toArray(),
    db.templates.toArray(),
    db.exercises.toArray(),
  ]);

  const active = sessions.find((s) => s.finishedAt === null) ?? null;
  const activeSetCount = active ? await db.sets.where('sessionId').equals(active.id).count() : 0;

  return {
    active,
    activeSetCount,
    templates,
    exercisesById: new Map(exercises.map((e) => [e.id, e])),
    finished: sessions
      .filter((s) => s.finishedAt !== null)
      .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0)),
  };
}

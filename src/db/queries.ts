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

export interface ExerciseOption {
  exercise: Exercise;
  lastTime: LastTime | null;
}

export interface ExerciseOptions {
  options: ExerciseOption[];
  takenNames: string[]; // every exercise's name in lower case, so none is created twice
}

// Every exercise that isn't excluded. Most recently used first, then the ones never
// logged, by name.
export async function getExerciseOptions(excludeIds: string[]): Promise<ExerciseOptions> {
  const [exercises, sets, sessions] = await Promise.all([
    db.exercises.toArray(),
    db.sets.toArray(),
    db.sessions.toArray(),
  ]);

  return {
    takenNames: exercises.map((e) => e.name.toLowerCase()),
    options: exercises
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
      ),
  };
}

export interface FinishedWorkout {
  session: Session;
  sets: LoggedSet[];
}

// Completed workouts, newest first, with their sets.
async function getFinishedWorkouts(sessions: Session[], limit = Infinity): Promise<FinishedWorkout[]> {
  const finished = sessions
    .filter((s) => s.finishedAt !== null)
    .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0))
    .slice(0, limit);

  const sets = await db.sets
    .where('sessionId')
    .anyOf(finished.map((s) => s.id))
    .toArray();

  return finished.map((session) => ({
    session,
    sets: sets.filter((s) => s.sessionId === session.id),
  }));
}

export interface HomeData {
  active: Session | null;
  activeSetCount: number;
  templates: Template[];
  exercisesById: Map<string, Exercise>;
  finished: Session[]; // completed workouts, newest first
  recent: FinishedWorkout[]; // the newest few, with their sets
  settings: Settings;
}

const RECENT_COUNT = 3;

export async function loadHome(): Promise<HomeData> {
  const [sessions, templates, exercises, settings] = await Promise.all([
    db.sessions.toArray(),
    db.templates.toArray(),
    db.exercises.toArray(),
    getSettings(),
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
    recent: await getFinishedWorkouts(sessions, RECENT_COUNT),
    settings,
  };
}

export interface HistoryData {
  workouts: FinishedWorkout[];
  exercisesById: Map<string, Exercise>;
  hasActiveWorkout: boolean;
  settings: Settings;
}

export async function loadHistory(): Promise<HistoryData> {
  const [sessions, exercises, settings] = await Promise.all([
    db.sessions.toArray(),
    db.exercises.toArray(),
    getSettings(),
  ]);

  return {
    workouts: await getFinishedWorkouts(sessions),
    exercisesById: new Map(exercises.map((e) => [e.id, e])),
    hasActiveWorkout: sessions.some((s) => s.finishedAt === null),
    settings,
  };
}

export interface RoutineData {
  templates: Template[];
  exercises: Exercise[];
}

export async function loadRoutine(): Promise<RoutineData> {
  const [templates, exercises] = await Promise.all([db.templates.toArray(), db.exercises.toArray()]);
  return { templates, exercises };
}

export interface ProgressData {
  exercise: Exercise | undefined;
  sessions: Session[]; // finished workouts that include this exercise
  sets: LoggedSet[]; // this exercise's sets from those workouts
  inProgressSets: number; // sets logged today, which count once the workout is finished
}

export async function loadProgress(exerciseId: string): Promise<ProgressData> {
  const [exercise, allSets] = await Promise.all([
    db.exercises.get(exerciseId),
    db.sets.where('exerciseId').equals(exerciseId).toArray(),
  ]);
  const found = await db.sessions.bulkGet([...new Set(allSets.map((s) => s.sessionId))]);
  const sessions = found.filter((s) => s !== undefined);
  const finishedIds = new Set(sessions.filter((s) => s.finishedAt !== null).map((s) => s.id));

  return {
    exercise,
    sessions: sessions.filter((s) => finishedIds.has(s.id)),
    sets: allSets.filter((s) => finishedIds.has(s.sessionId)),
    inProgressSets: allSets.filter((s) => !finishedIds.has(s.sessionId)).length,
  };
}

// Every exercise with at least one set in a finished workout, by name.
export async function getLoggedExercises(): Promise<Exercise[]> {
  const [exercises, sets, sessions] = await Promise.all([
    db.exercises.toArray(),
    db.sets.toArray(),
    db.sessions.toArray(),
  ]);
  const finished = new Set(sessions.filter((s) => s.finishedAt !== null).map((s) => s.id));
  const logged = new Set(sets.filter((s) => finished.has(s.sessionId)).map((s) => s.exerciseId));
  return exercises.filter((e) => logged.has(e.id)).sort((a, b) => a.name.localeCompare(b.name));
}

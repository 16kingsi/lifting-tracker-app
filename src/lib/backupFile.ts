// The backup file: building it, checking a file before importing it, and working out
// what a merge would add. Nothing here touches the database, so it's all testable.
import { SCHEMA_VERSION } from '../db/version';
import type { Exercise, LoggedSet, PlanItem, Session, Settings, Template, TemplateId, Unit } from '../types';

const APP = 'lifting-tracker';

export interface BackupData {
  exercises: Exercise[];
  templates: Template[];
  sessions: Session[];
  sets: LoggedSet[];
}

export interface BackupFile extends BackupData {
  app: typeof APP;
  schemaVersion: number;
  exportedAt: string; // ISO date and time
  settings: Pick<Settings, 'defaultUnit' | 'backupIntervalDays'>;
}

export function buildBackupFile(data: BackupData, settings: Settings, now: number): BackupFile {
  return {
    app: APP,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date(now).toISOString(),
    settings: { defaultUnit: settings.defaultUnit, backupIntervalDays: settings.backupIntervalDays },
    ...data,
  };
}

// Upgrades for files saved by older versions, keyed by the version they upgrade to.
// Version 2 only added a setting that isn't in files, so a version 1 file needs no
// change. A future version that renames a field would add, for example:
//   3: (file) => ({ ...file, sets: file.sets.map(...) }),
const FILE_UPGRADES: Record<number, (file: Record<string, unknown>) => Record<string, unknown>> = {
  2: (file) => file,
};

export type ParseResult = { ok: true; file: BackupFile; skipped: number } | { ok: false; error: string };

const NOT_A_BACKUP = "This file isn't a backup from this app.";

// Checks a file's text and turns it into a backup ready to import. Anything broken
// is left out and counted, rather than stopping the whole import.
export function parseBackupFile(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: NOT_A_BACKUP };
  }
  if (!isRecord(raw) || raw.app !== APP || !Number.isInteger(raw.schemaVersion)) {
    return { ok: false, error: NOT_A_BACKUP };
  }

  const version = raw.schemaVersion as number;
  if (version > SCHEMA_VERSION) {
    return {
      ok: false,
      error: 'This backup is from a newer version of the app. Close and reopen the app to update it, then try again.',
    };
  }
  let file = raw;
  for (let v = version + 1; v <= SCHEMA_VERSION; v++) file = FILE_UPGRADES[v]?.(file) ?? file;

  const lists = ['exercises', 'templates', 'sessions', 'sets'] as const;
  if (!lists.every((key) => Array.isArray(file[key]))) return { ok: false, error: NOT_A_BACKUP };

  const settings = isRecord(file.settings) ? file.settings : {};
  const cleaned = cleanData({
    exercises: (file.exercises as unknown[]).map(toExercise),
    templates: (file.templates as unknown[]).map(toTemplate),
    sessions: (file.sessions as unknown[]).map(toSession),
    sets: (file.sets as unknown[]).map(toSet),
  });

  return {
    ok: true,
    skipped: cleaned.skipped,
    file: {
      app: APP,
      schemaVersion: SCHEMA_VERSION,
      exportedAt: typeof file.exportedAt === 'string' ? file.exportedAt : '',
      settings: {
        defaultUnit: settings.defaultUnit === 'kg' ? 'kg' : 'lb',
        backupIntervalDays:
          settings.backupIntervalDays === null || typeof settings.backupIntervalDays === 'number'
            ? (settings.backupIntervalDays as number | null)
            : 14,
      },
      ...cleaned.data,
    },
  };
}

// Drops anything that couldn't be read, and anything pointing at something missing,
// so an imported file can't leave the app in a broken state.
export function cleanData(data: {
  exercises: Array<Exercise | null>;
  templates: Array<Template | null>;
  sessions: Array<Session | null>;
  sets: Array<LoggedSet | null>;
}): { data: BackupData; skipped: number } {
  let skipped = 0;
  const keep = <T>(items: Array<T | null>, test: (item: T) => boolean = () => true): T[] =>
    items.filter((item): item is T => {
      const ok = item !== null && test(item);
      if (!ok) skipped++;
      return ok;
    });

  const exercises = uniqueById(keep(data.exercises));
  const exerciseIds = new Set(exercises.map((e) => e.id));
  const knownItems = (items: PlanItem[]) => items.filter((i) => exerciseIds.has(i.exerciseId));

  const sessions = uniqueById(keep(data.sessions)).map((s) => ({ ...s, items: knownItems(s.items) }));
  // Only one workout can be in progress. Any others count as finished when they started.
  const inProgress = sessions.filter((s) => s.finishedAt === null).sort((a, b) => b.startedAt - a.startedAt);
  for (const extra of inProgress.slice(1)) extra.finishedAt = extra.startedAt;

  const sessionIds = new Set(sessions.map((s) => s.id));
  const sets = uniqueById(keep(data.sets, (s) => sessionIds.has(s.sessionId) && exerciseIds.has(s.exerciseId)));

  const templates: Template[] = (['A', 'B'] as TemplateId[]).map((id) => {
    const found = keep(data.templates).find((t) => t.id === id);
    return { id, items: found ? knownItems(found.items) : [] };
  });

  return { data: { exercises, templates, sessions, sets }, skipped };
}

export interface BackupSummary {
  workouts: number; // finished
  inProgress: boolean;
  sets: number;
  exercises: number;
  first: number | null; // date of the oldest finished workout
  last: number | null;
}

export function summarize(data: Pick<BackupData, 'sessions' | 'sets' | 'exercises'>): BackupSummary {
  const finished = data.sessions.filter((s) => s.finishedAt !== null).map((s) => s.finishedAt as number);
  return {
    workouts: finished.length,
    inProgress: data.sessions.some((s) => s.finishedAt === null),
    sets: data.sets.length,
    exercises: new Set(data.sets.map((s) => s.exerciseId)).size,
    first: finished.length ? Math.min(...finished) : null,
    last: finished.length ? Math.max(...finished) : null,
  };
}

export interface MergePlan {
  exercises: Exercise[]; // new to this phone
  sessions: Session[];
  sets: LoggedSet[];
  alreadyHere: number; // workouts this phone already has
  skippedInProgress: number; // workouts in progress in the file, which a merge leaves out
}

// What a merge would add. Nothing on the phone is changed or removed. An exercise
// with the same name as one on the phone is treated as that exercise, so its history
// joins up. Workouts the phone already has, and any still in progress, are left out.
export function planMerge(
  local: { exercises: Exercise[]; sessionIds: Set<string>; setIds: Set<string> },
  incoming: Pick<BackupData, 'exercises' | 'sessions' | 'sets'>,
): MergePlan {
  const localIds = new Set(local.exercises.map((e) => e.id));
  const byName = new Map(local.exercises.map((e) => [e.name.trim().toLowerCase(), e.id]));
  const idFor = new Map<string, string>(); // file's exercise id -> id to use here
  const exercises: Exercise[] = [];

  for (const exercise of incoming.exercises) {
    const name = exercise.name.trim().toLowerCase();
    const match = localIds.has(exercise.id) ? exercise.id : byName.get(name);
    if (match) {
      idFor.set(exercise.id, match);
    } else {
      exercises.push(exercise);
      localIds.add(exercise.id);
      byName.set(name, exercise.id);
      idFor.set(exercise.id, exercise.id);
    }
  }

  let alreadyHere = 0;
  let skippedInProgress = 0;
  const sessions: Session[] = [];
  for (const session of incoming.sessions) {
    if (local.sessionIds.has(session.id)) alreadyHere++;
    else if (session.finishedAt === null) skippedInProgress++;
    else {
      const items = session.items.map((i) => ({ ...i, exerciseId: idFor.get(i.exerciseId) ?? i.exerciseId }));
      // Two exercises in the file can turn into the same one here, so keep it once.
      const unique = items.filter((item, n) => items.findIndex((i) => i.exerciseId === item.exerciseId) === n);
      sessions.push({ ...session, items: unique, reopened: undefined, currentIndex: 0 });
    }
  }

  const added = new Set(sessions.map((s) => s.id));
  const sets = incoming.sets
    .filter((s) => added.has(s.sessionId) && !local.setIds.has(s.id))
    .map((s) => ({ ...s, exerciseId: idFor.get(s.exerciseId) ?? s.exerciseId }));

  // Leave out exercises nothing refers to, such as a file's unused alternatives.
  const used = new Set([...sets.map((s) => s.exerciseId), ...sessions.flatMap((s) => s.items.map((i) => i.exerciseId))]);
  return { exercises: exercises.filter((e) => used.has(e.id)), sessions, sets, alreadyHere, skippedInProgress };
}

// ---- Reading each kind of record, or null if it can't be read

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const isText = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isUnit = (v: unknown): v is Unit => v === 'lb' || v === 'kg';
const isTemplateId = (v: unknown): v is TemplateId => v === 'A' || v === 'B';

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => !seen.has(item.id) && !!seen.add(item.id));
}

function toPlanItems(value: unknown): PlanItem[] | null {
  if (!Array.isArray(value)) return null;
  return value
    .filter((i) => isRecord(i) && isText(i.exerciseId))
    .map((i) => ({
      exerciseId: i.exerciseId as string,
      targetSets: isNumber(i.targetSets) && i.targetSets >= 1 ? Math.round(i.targetSets) : 3,
    }));
}

function toExercise(v: unknown): Exercise | null {
  if (!isRecord(v) || !isText(v.id) || !isText(v.name)) return null;
  return { id: v.id, name: v.name.trim(), type: v.type === 'timed' ? 'timed' : 'weight' };
}

function toTemplate(v: unknown): Template | null {
  if (!isRecord(v) || !isTemplateId(v.id)) return null;
  const items = toPlanItems(v.items);
  return items ? { id: v.id, items } : null;
}

function toSession(v: unknown): Session | null {
  if (!isRecord(v) || !isText(v.id) || !isTemplateId(v.templateId) || !isNumber(v.startedAt)) return null;
  if (v.finishedAt !== null && !isNumber(v.finishedAt)) return null;
  const items = toPlanItems(v.items);
  if (!items) return null;
  const session: Session = {
    id: v.id,
    templateId: v.templateId,
    startedAt: v.startedAt,
    finishedAt: v.finishedAt as number | null,
    items,
    currentIndex: isNumber(v.currentIndex) ? Math.max(0, Math.round(v.currentIndex)) : 0,
  };
  const r = v.reopened;
  if (session.finishedAt === null && isRecord(r) && isNumber(r.at) && isNumber(r.previousFinishedAt)) {
    session.reopened = { at: r.at, previousFinishedAt: r.previousFinishedAt };
  }
  return session;
}

function toSet(v: unknown): LoggedSet | null {
  if (!isRecord(v) || !isText(v.id) || !isText(v.sessionId) || !isText(v.exerciseId)) return null;
  const base = {
    id: v.id,
    sessionId: v.sessionId,
    exerciseId: v.exerciseId,
    order: isNumber(v.order) ? v.order : 0,
    note: typeof v.note === 'string' ? v.note : '',
    loggedAt: isNumber(v.loggedAt) ? v.loggedAt : 0,
  };
  if (v.kind === 'timed') {
    return isNumber(v.durationSec) && v.durationSec > 0 ? { ...base, kind: 'timed', durationSec: v.durationSec } : null;
  }
  if (v.kind !== 'weight' || !isNumber(v.reps) || v.reps <= 0 || !isNumber(v.weightValue) || v.weightValue < 0) {
    return null;
  }
  if (!isUnit(v.weightUnit)) return null;
  return { ...base, kind: 'weight', reps: v.reps, weightValue: v.weightValue, weightUnit: v.weightUnit };
}

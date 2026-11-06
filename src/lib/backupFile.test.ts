import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION } from '../db/version';
import type { Exercise, LoggedSet, Session, Settings } from '../types';
import { buildBackupFile, parseBackupFile, planMerge, summarize, type BackupData } from './backupFile';

const settings: Settings = {
  id: 'settings',
  defaultUnit: 'kg',
  backupIntervalDays: 7,
  lastExportAt: null,
  firstRunAt: 0,
  bannerDismissedAt: null,
  workoutsSinceExport: 2,
};

const data: BackupData = {
  exercises: [
    { id: 'bench-press', name: 'Bench Press', type: 'weight' },
    { id: 'x1', name: 'Goblet Squat', type: 'weight' },
    { id: 'x2', name: 'Zercher Squat', type: 'weight' },
  ],
  templates: [{ id: 'A', items: [{ exerciseId: 'bench-press', targetSets: 3 }] }],
  sessions: [
    { id: 'w1', templateId: 'A', startedAt: 1000, finishedAt: 2000, items: [{ exerciseId: 'bench-press', targetSets: 3 }, { exerciseId: 'x1', targetSets: 3 }], currentIndex: 1 },
    { id: 'w2', templateId: 'B', startedAt: 5000, finishedAt: 6000, items: [{ exerciseId: 'x2', targetSets: 3 }], currentIndex: 0 },
    { id: 'open', templateId: 'A', startedAt: 7000, finishedAt: null, items: [], currentIndex: 0 },
  ],
  sets: [
    { id: 's1', sessionId: 'w1', exerciseId: 'bench-press', order: 1, note: '', loggedAt: 1100, kind: 'weight', reps: 8, weightValue: 95, weightUnit: 'lb' },
    { id: 's2', sessionId: 'w1', exerciseId: 'x1', order: 2, note: '', loggedAt: 1200, kind: 'weight', reps: 10, weightValue: 20, weightUnit: 'kg' },
    { id: 's3', sessionId: 'w2', exerciseId: 'x2', order: 1, note: 'hi', loggedAt: 5100, kind: 'weight', reps: 5, weightValue: 60, weightUnit: 'kg' },
  ],
};

const fileText = () => JSON.stringify(buildBackupFile(data, settings, Date.UTC(2026, 10, 6)));

describe('buildBackupFile and parseBackupFile', () => {
  it('round-trips everything, with the schema version', () => {
    const file = buildBackupFile(data, settings, Date.UTC(2026, 10, 6));
    expect(file.schemaVersion).toBe(SCHEMA_VERSION);
    expect(file.settings).toEqual({ defaultUnit: 'kg', backupIntervalDays: 7 });

    const result = parseBackupFile(fileText());
    if (!result.ok) throw new Error(result.error);
    expect(result.skipped).toBe(0);
    expect(result.file.sessions).toEqual(data.sessions);
    expect(result.file.sets).toEqual(data.sets);
    // A missing day comes back empty rather than missing.
    expect(result.file.templates.map((t) => t.id)).toEqual(['A', 'B']);
  });

  it('refuses things that are not backups', () => {
    expect(parseBackupFile('not json').ok).toBe(false);
    expect(parseBackupFile('{"hello": 1}').ok).toBe(false);
    expect(parseBackupFile(JSON.stringify({ app: 'lifting-tracker', schemaVersion: 1 })).ok).toBe(false);
  });

  it('refuses files from a newer version, and upgrades older ones', () => {
    const file = JSON.parse(fileText());
    expect(parseBackupFile(JSON.stringify({ ...file, schemaVersion: SCHEMA_VERSION + 1 })).ok).toBe(false);
    expect(parseBackupFile(JSON.stringify({ ...file, schemaVersion: 1 })).ok).toBe(true);
  });

  it('leaves out broken records and anything pointing at them', () => {
    const file = JSON.parse(fileText());
    file.exercises = file.exercises.filter((e: Exercise) => e.id !== 'x1');
    file.sets.push({ id: 'bad', kind: 'weight', reps: -1 });
    const result = parseBackupFile(JSON.stringify(file));
    if (!result.ok) throw new Error(result.error);
    expect(result.file.sets.map((s: LoggedSet) => s.id)).toEqual(['s1', 's3']);
    expect(result.file.sessions[0].items.map((i) => i.exerciseId)).toEqual(['bench-press']);
    expect(result.skipped).toBe(2);
  });

  it('keeps only one workout in progress', () => {
    const file = JSON.parse(fileText());
    file.sessions.push({ ...file.sessions[2], id: 'open2', startedAt: 100 });
    const result = parseBackupFile(JSON.stringify(file));
    if (!result.ok) throw new Error(result.error);
    expect(result.file.sessions.filter((s: Session) => s.finishedAt === null).map((s) => s.id)).toEqual(['open']);
  });
});

describe('summarize', () => {
  it('counts finished workouts and their range', () => {
    expect(summarize(data)).toEqual({ workouts: 2, inProgress: true, sets: 3, exercises: 3, first: 2000, last: 6000 });
  });
});

describe('planMerge', () => {
  const local = {
    exercises: [
      { id: 'bench-press', name: 'Bench Press', type: 'weight' as const },
      { id: 'mine', name: 'goblet squat', type: 'weight' as const },
    ],
    sessionIds: new Set(['w1']),
    setIds: new Set<string>(),
  };

  it('adds only workouts this phone lacks, leaving out one in progress', () => {
    const plan = planMerge(local, data);
    expect(plan.sessions.map((s) => s.id)).toEqual(['w2']);
    expect(plan.sets.map((s) => s.id)).toEqual(['s3']);
    expect(plan.alreadyHere).toBe(1);
    expect(plan.skippedInProgress).toBe(1);
  });

  it('joins exercises up by name, and adds only new ones that are used', () => {
    const plan = planMerge({ ...local, sessionIds: new Set() }, data);
    expect(plan.exercises.map((e) => e.name)).toEqual(['Zercher Squat']);
    const w1 = plan.sessions.find((s) => s.id === 'w1')!;
    expect(w1.items.map((i) => i.exerciseId)).toEqual(['bench-press', 'mine']);
    expect(plan.sets.find((s) => s.id === 's2')!.exerciseId).toBe('mine');
  });
});

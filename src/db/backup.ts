// Reading everything out for a backup, and writing an imported file back in.
import { buildBackupFile, type BackupFile, type MergePlan } from '../lib/backupFile';
import { toCsv } from '../lib/csv';
import { db } from './schema';
import { getSettings } from './queries';

export async function readBackupFile(): Promise<BackupFile> {
  const [exercises, templates, sessions, sets, settings] = await Promise.all([
    db.exercises.toArray(),
    db.templates.toArray(),
    db.sessions.toArray(),
    db.sets.toArray(),
    getSettings(),
  ]);
  return buildBackupFile({ exercises, templates, sessions, sets }, settings, Date.now());
}

export async function readCsv(): Promise<string> {
  const [exercises, sessions, sets] = await Promise.all([
    db.exercises.toArray(),
    db.sessions.toArray(),
    db.sets.toArray(),
  ]);
  return toCsv(sessions, sets, exercises);
}

// After a backup file has been shared or saved: the reminder starts counting again.
export async function markBackedUp(): Promise<void> {
  await db.settings.update('settings', {
    lastExportAt: Date.now(),
    workoutsSinceExport: 0,
    bannerDismissedAt: null,
  });
}

export async function dismissBackupBanner(): Promise<void> {
  await db.settings.update('settings', { bannerDismissedAt: Date.now() });
}

export async function setBackupInterval(backupIntervalDays: number | null): Promise<void> {
  await db.settings.update('settings', { backupIntervalDays });
}

// What a merge needs to know about this phone.
export async function loadMergeContext() {
  const [exercises, sessions, sets] = await Promise.all([
    db.exercises.toArray(),
    db.sessions.toArray(),
    db.sets.toArray(),
  ]);
  return {
    exercises,
    sessionIds: new Set(sessions.map((s) => s.id)),
    setIds: new Set(sets.map((s) => s.id)),
    finishedCount: sessions.filter((s) => s.finishedAt !== null).length,
    hasActive: sessions.some((s) => s.finishedAt === null),
  };
}

// Adds what planMerge worked out. Nothing already here changes.
export async function applyMerge(plan: MergePlan): Promise<void> {
  await db.transaction('rw', db.exercises, db.sessions, db.sets, db.settings, async () => {
    await db.exercises.bulkAdd(plan.exercises);
    await db.sessions.bulkAdd(plan.sessions);
    await db.sets.bulkAdd(plan.sets);
    // Workouts from somewhere else aren't in this phone's backups yet.
    await db.settings
      .where('id')
      .equals('settings')
      .modify((settings) => {
        settings.workoutsSinceExport += plan.sessions.length;
      });
  });
}

// Deletes everything and puts the file's data, routine and settings in its place.
// This phone's own backup history is kept.
export async function replaceEverything(file: BackupFile): Promise<void> {
  await db.transaction('rw', [db.exercises, db.templates, db.sessions, db.sets, db.settings], async () => {
    await Promise.all([db.exercises.clear(), db.templates.clear(), db.sessions.clear(), db.sets.clear()]);
    await db.exercises.bulkAdd(file.exercises);
    await db.templates.bulkAdd(file.templates);
    await db.sessions.bulkAdd(file.sessions);
    await db.sets.bulkAdd(file.sets);
    await db.settings.update('settings', {
      defaultUnit: file.settings.defaultUnit,
      backupIntervalDays: file.settings.backupIntervalDays,
      workoutsSinceExport: 0, // everything here now came from a backup
    });
  });
}

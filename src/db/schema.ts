import Dexie, { type EntityTable } from 'dexie';
import type { Exercise, LoggedSet, Session, Settings, Template } from '../types';
import { seedDatabase } from './seed';
import { SCHEMA_VERSION } from './version';

export { SCHEMA_VERSION };

// To change the data model later without losing history:
//  1. Raise SCHEMA_VERSION in version.ts.
//  2. Add a db.version(n) block below, like version 2's.
//  3. If exported files change shape, add an upgrade to FILE_UPGRADES in
//     src/lib/backupFile.ts, so older backups can still be imported.
// Dexie runs any upgrades a phone has missed, in order, the next time it opens.

export const db = new Dexie('lifting-tracker') as Dexie & {
  settings: EntityTable<Settings, 'id'>;
  exercises: EntityTable<Exercise, 'id'>;
  templates: EntityTable<Template, 'id'>;
  sessions: EntityTable<Session, 'id'>;
  sets: EntityTable<LoggedSet, 'id'>;
};

// Each string lists a table's key, then the fields it can look rows up by.
db.version(1).stores({
  settings: 'id',
  exercises: 'id',
  templates: 'id',
  sessions: 'id, startedAt',
  sets: 'id, sessionId, exerciseId, [sessionId+exerciseId]',
});

// Version 2 adds a count of workouts finished since the last backup. Phones that
// have never backed up start with every finished workout counted.
db.version(2)
  .stores({})
  .upgrade(async (tx) => {
    const finished = await tx.table('sessions').filter((s: Session) => s.finishedAt !== null).count();
    await tx.table('settings').update('settings', { workoutsSinceExport: finished });
  });

if (SCHEMA_VERSION !== 2) throw new Error('Add a db.version() block for the new SCHEMA_VERSION');

// Runs once only, the first time the database is created on a phone.
db.on('populate', seedDatabase);

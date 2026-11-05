import Dexie, { type EntityTable } from 'dexie';
import type { Exercise, LoggedSet, Session, Settings, Template } from '../types';
import { seedDatabase } from './seed';

// The version of the data model. Exported files carry this number too.
//
// To change the data model later without losing history:
//  1. Raise SCHEMA_VERSION.
//  2. Add a block below, for example:
//       db.version(2).stores({ ...only the tables that changed... })
//         .upgrade((tx) => tx.table('sets').toCollection().modify((set) => { ... }));
// Dexie runs any upgrades a phone has missed, in order, the next time it opens.
export const SCHEMA_VERSION = 1;

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

// Runs once only, the first time the database is created on a phone.
db.on('populate', seedDatabase);

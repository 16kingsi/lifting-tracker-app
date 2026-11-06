// The shapes of everything the app stores. See src/db/schema.ts for the database.

export type Unit = 'lb' | 'kg';
export type ExerciseType = 'weight' | 'timed';
export type TemplateId = 'A' | 'B';

export interface Settings {
  id: 'settings'; // there is only ever one row
  defaultUnit: Unit;
  backupIntervalDays: number | null; // null means reminders are off
  lastExportAt: number | null;
  firstRunAt: number;
  bannerDismissedAt: number | null;
  workoutsSinceExport: number; // workouts finished since the last backup
}

export interface Exercise {
  id: string;
  name: string;
  type: ExerciseType;
}

// One exercise in a day's plan.
export interface PlanItem {
  exerciseId: string;
  targetSets: number;
}

export interface Template {
  id: TemplateId;
  items: PlanItem[];
}

export interface Session {
  id: string;
  templateId: TemplateId;
  startedAt: number;
  finishedAt: number | null; // null means the workout is still in progress
  items: PlanItem[]; // this workout's own copy, so swaps can apply to today only
  currentIndex: number; // which exercise was on screen, for resuming
  // Set while a finished workout is opened again, so it can keep its original date.
  reopened?: { at: number; previousFinishedAt: number };
}

interface SetBase {
  id: string;
  sessionId: string;
  exerciseId: string;
  order: number;
  note: string;
  loggedAt: number;
}

// A weight is stored exactly as entered. Pounds are only worked out for display.
export interface WeightSet extends SetBase {
  kind: 'weight';
  reps: number;
  weightValue: number;
  weightUnit: Unit;
}

export interface TimedSet extends SetBase {
  kind: 'timed';
  durationSec: number;
}

export type LoggedSet = WeightSet | TimedSet;

// The values in the entry panel for the set being entered, before it is logged.
export interface Draft {
  reps: number;
  weight: number;
  unit: Unit;
  seconds: number;
  note: string;
}

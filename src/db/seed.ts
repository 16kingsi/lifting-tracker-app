import type { Transaction } from 'dexie';
import type { Exercise, PlanItem, Settings, Template } from '../types';

// A generic starter routine. Everyone can change it on the Routine screen.
const dayA: Array<[id: string, name: string, type: Exercise['type'], targetSets: number]> = [
  ['back-squat', 'Back Squat', 'weight', 3],
  ['bench-press', 'Bench Press', 'weight', 3],
  ['dumbbell-row', 'Dumbbell Row', 'weight', 3],
  ['plank', 'Plank', 'timed', 2],
];

const dayB: typeof dayA = [
  ['romanian-deadlift', 'Romanian Deadlift', 'weight', 3],
  ['overhead-press', 'Overhead Press', 'weight', 3],
  ['lat-pulldown', 'Lat Pulldown', 'weight', 3],
  ['side-plank', 'Side Plank', 'timed', 3],
];

// Common swaps for when the equipment is taken.
const alternatives: Exercise[] = [
  { id: 'dumbbell-bench-press', name: 'Dumbbell Bench Press', type: 'weight' },
  { id: 'machine-chest-press', name: 'Machine Chest Press', type: 'weight' },
  { id: 'push-up', name: 'Push-up', type: 'weight' },
  { id: 'goblet-squat', name: 'Goblet Squat', type: 'weight' },
  { id: 'leg-press', name: 'Leg Press', type: 'weight' },
  { id: 'seated-row', name: 'Seated Row', type: 'weight' },
];

function toPlan(day: typeof dayA): PlanItem[] {
  return day.map(([exerciseId, , , targetSets]) => ({ exerciseId, targetSets }));
}

export function seedDatabase(tx: Transaction) {
  const exercises: Exercise[] = [...dayA, ...dayB].map(([id, name, type]) => ({ id, name, type }));
  const templates: Template[] = [
    { id: 'A', items: toPlan(dayA) },
    { id: 'B', items: toPlan(dayB) },
  ];
  const settings: Settings = {
    id: 'settings',
    defaultUnit: 'lb',
    backupIntervalDays: 14,
    lastExportAt: null,
    firstRunAt: Date.now(),
    bannerDismissedAt: null,
  };

  tx.table('exercises').bulkAdd([...exercises, ...alternatives]);
  tx.table('templates').bulkAdd(templates);
  tx.table('settings').add(settings);
}

import { describe, expect, it } from 'vitest';
import type { Exercise, LoggedSet, Session, Template } from '../types';
import { summarizeExercises } from './exerciseList';

const exercises: Exercise[] = [
  { id: 'bench', name: 'Bench Press', type: 'weight' },
  { id: 'plank', name: 'Plank', type: 'timed' },
  { id: 'curl', name: 'Curl', type: 'weight' },
  { id: 'row', name: 'Row', type: 'weight' },
  { id: 'dip', name: 'Dip', type: 'weight' },
];

const sessions: Session[] = [
  { id: 'w1', templateId: 'A', startedAt: 0, finishedAt: 100, items: [], currentIndex: 0 },
  { id: 'w2', templateId: 'B', startedAt: 200, finishedAt: 300, items: [], currentIndex: 0 },
  { id: 'now', templateId: 'A', startedAt: 400, finishedAt: null, items: [{ exerciseId: 'dip', targetSets: 3 }], currentIndex: 0 },
];

let n = 0;
const lift = (sessionId: string, exerciseId: string, weightValue: number, weightUnit: 'lb' | 'kg' = 'lb'): LoggedSet => ({
  id: `s${++n}`, sessionId, exerciseId, order: n, note: '', loggedAt: 0, kind: 'weight', reps: 5, weightValue, weightUnit,
});
const hold = (sessionId: string, durationSec: number): LoggedSet => ({
  id: `s${++n}`, sessionId, exerciseId: 'plank', order: n, note: '', loggedAt: 0, kind: 'timed', durationSec,
});

const sets = [lift('w1', 'bench', 100), lift('w2', 'bench', 50, 'kg'), lift('w2', 'bench', 95), hold('w1', 45), lift('now', 'curl', 20)];
const templates: Template[] = [
  { id: 'A', items: [{ exerciseId: 'bench', targetSets: 3 }] },
  { id: 'B', items: [{ exerciseId: 'bench', targetSets: 3 }, { exerciseId: 'row', targetSets: 3 }] },
];

const byId = Object.fromEntries(summarizeExercises(exercises, sessions, sets, templates).map((s) => [s.exercise.id, s]));

describe('summarizeExercises', () => {
  it('counts finished workouts and finds the latest and the best, in pounds', () => {
    expect(byId.bench).toMatchObject({ workouts: 2, lastDate: 300, best: 'Top set 110.2 lb', days: ['A', 'B'] });
  });

  it('uses the longest hold for timed exercises', () => {
    expect(byId.plank).toMatchObject({ workouts: 1, best: 'Longest hold 0:45' });
  });

  it('says most reps without repeating the word', () => {
    const bodyweight = summarizeExercises(exercises, sessions, [lift('w1', 'row', 0)], templates);
    expect(bodyweight.find((s) => s.exercise.id === 'row')!.best).toBe('Most reps 5');
  });

  it('leaves out sets from the workout in progress', () => {
    expect(byId.curl).toMatchObject({ workouts: 0, lastDate: null, best: null, inActiveWorkout: true });
  });

  it('only allows deleting exercises that nothing uses', () => {
    expect(byId.bench.canDelete).toBe(false); // logged
    expect(byId.curl.canDelete).toBe(false); // logged today
    expect(byId.row.canDelete).toBe(false); // in the routine
    expect(byId.dip.canDelete).toBe(false); // planned for today's workout
    const spare = summarizeExercises([{ id: 'x', name: 'X', type: 'weight' }], sessions, sets, templates);
    expect(spare[0].canDelete).toBe(true);
  });
});

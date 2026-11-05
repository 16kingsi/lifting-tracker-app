import { describe, expect, it } from 'vitest';
import type { LoggedSet, Session } from '../types';
import { groupSets } from './sessionGroups';

const session: Session = {
  id: 's',
  templateId: 'A',
  startedAt: 0,
  finishedAt: 1,
  items: [
    { exerciseId: 'squat', targetSets: 3 },
    { exerciseId: 'plank', targetSets: 2 },
  ],
  currentIndex: 0,
};

function timed(id: string, exerciseId: string, order: number): LoggedSet {
  return { id, sessionId: 's', exerciseId, order, note: '', loggedAt: 0, kind: 'timed', durationSec: 30 };
}

describe('groupSets', () => {
  it('follows the order of the workout and sorts each exercise by the order logged', () => {
    const groups = groupSets(session, [timed('b', 'plank', 3), timed('a', 'squat', 2), timed('c', 'plank', 1)]);
    expect(groups.map((g) => g.exerciseId)).toEqual(['squat', 'plank']);
    expect(groups[1].sets.map((s) => s.id)).toEqual(['c', 'b']);
  });

  it('keeps planned exercises that have no sets', () => {
    const groups = groupSets(session, [timed('a', 'squat', 1)]);
    expect(groups[1]).toEqual({ exerciseId: 'plank', sets: [] });
  });

  it('includes logged exercises that are no longer in the plan', () => {
    const groups = groupSets(session, [timed('a', 'row', 1)]);
    expect(groups.map((g) => g.exerciseId)).toEqual(['squat', 'plank', 'row']);
  });
});

import { describe, expect, it } from 'vitest';
import type { LoggedSet, Session } from '../types';
import { pickLastTime } from './lastTime';

function session(id: string, finishedAt: number | null): Session {
  return { id, templateId: 'A', startedAt: 0, finishedAt, items: [], currentIndex: 0 };
}

function set(sessionId: string, order: number, reps: number): LoggedSet {
  return {
    id: `${sessionId}-${order}`,
    sessionId,
    exerciseId: 'bench',
    order,
    note: '',
    loggedAt: 0,
    kind: 'weight',
    reps,
    weightValue: 95,
    weightUnit: 'lb',
  };
}

describe('pickLastTime', () => {
  it('returns null when the exercise has no history', () => {
    expect(pickLastTime([], [session('a', 100)])).toBeNull();
  });

  it('picks the most recently finished session', () => {
    const sets = [set('old', 1, 5), set('new', 1, 8)];
    const result = pickLastTime(sets, [session('old', 100), session('new', 200)]);
    expect(result?.finishedAt).toBe(200);
    expect(result?.sets.map((s) => s.id)).toEqual(['new-1']);
  });

  it('ignores a workout still in progress', () => {
    const sets = [set('done', 1, 5), set('active', 1, 8)];
    const result = pickLastTime(sets, [session('done', 100), session('active', null)]);
    expect(result?.sets.map((s) => s.id)).toEqual(['done-1']);
  });

  it('skips newer sessions that did not include the exercise', () => {
    const result = pickLastTime([set('old', 1, 5)], [session('old', 100), session('new', 200)]);
    expect(result?.finishedAt).toBe(100);
  });

  it('returns sets in the order they were logged', () => {
    const sets = [set('a', 2, 7), set('a', 1, 8)];
    const result = pickLastTime(sets, [session('a', 100)]);
    expect(result?.sets.map((s) => s.order)).toEqual([1, 2]);
  });
});

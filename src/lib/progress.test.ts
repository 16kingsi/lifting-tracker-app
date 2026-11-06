import { describe, expect, it } from 'vitest';
import type { LoggedSet, Session } from '../types';
import {
  estimateOneRepMax,
  formatChange,
  formatValue,
  metricsFor,
  pointsInRange,
  progressPoints,
} from './progress';

const DAY = 86400000;

function session(id: string, finishedAt: number | null): Session {
  return { id, templateId: 'A', startedAt: 0, finishedAt, items: [], currentIndex: 0 };
}

let order = 0;
function lift(sessionId: string, reps: number, weightValue: number, weightUnit: 'lb' | 'kg' = 'lb'): LoggedSet {
  order++;
  return { id: `s${order}`, sessionId, exerciseId: 'e', order, note: '', loggedAt: 0, kind: 'weight', reps, weightValue, weightUnit };
}

function hold(sessionId: string, durationSec: number): LoggedSet {
  order++;
  return { id: `s${order}`, sessionId, exerciseId: 'e', order, note: '', loggedAt: 0, kind: 'timed', durationSec };
}

describe('metricsFor', () => {
  it('offers top set and 1RM for weighted lifts', () => {
    expect(metricsFor('weight', [lift('a', 8, 95)])).toEqual(['top', 'e1rm']);
  });

  it('offers most reps when nothing has had weight', () => {
    expect(metricsFor('weight', [lift('a', 12, 0)])).toEqual(['reps']);
  });

  it('offers longest hold for timed exercises', () => {
    expect(metricsFor('timed', [])).toEqual(['hold']);
  });
});

describe('estimateOneRepMax', () => {
  it('uses the Epley formula', () => {
    expect(estimateOneRepMax(90, 10)).toBe(120);
  });

  it('treats a single rep as the max', () => {
    expect(estimateOneRepMax(200, 1)).toBe(200);
  });
});

describe('progressPoints', () => {
  const sessions = [session('new', 3 * DAY), session('old', 1 * DAY), session('open', null)];

  it('takes the best set of each finished workout, oldest first', () => {
    const sets = [lift('new', 8, 100), lift('new', 5, 110), lift('old', 8, 95), lift('open', 1, 500)];
    const points = progressPoints(sessions, sets, 'top');
    expect(points.map((p) => [p.sessionId, p.value])).toEqual([
      ['old', 95],
      ['new', 110],
    ]);
  });

  it('compares kg sets in pounds and marks them', () => {
    const points = progressPoints(sessions, [lift('old', 8, 50, 'kg'), lift('old', 8, 100)], 'top');
    expect(points[0].value).toBeCloseTo(110.23, 2);
    expect(points[0].loggedInKg).toBe(true);
  });

  it('can pick a different set for the 1RM than for the top set', () => {
    const sets = [lift('old', 10, 90), lift('old', 1, 110)];
    expect(progressPoints(sessions, sets, 'top')[0].value).toBe(110);
    expect(progressPoints(sessions, sets, 'e1rm')[0].value).toBe(120);
  });

  it('uses holds for timed exercises and skips workouts without one', () => {
    const points = progressPoints(sessions, [hold('old', 30), hold('old', 45), lift('new', 8, 0)], 'hold');
    expect(points.map((p) => p.value)).toEqual([45]);
  });
});

describe('pointsInRange', () => {
  it('keeps only recent points', () => {
    const points = [40, 10, 1].map((days) => ({ sessionId: String(days), date: 100 * DAY - days * DAY, value: 1, loggedInKg: false }));
    expect(pointsInRange(points, '1M', 100 * DAY).map((p) => p.sessionId)).toEqual(['10', '1']);
    expect(pointsInRange(points, 'All', 100 * DAY)).toHaveLength(3);
  });
});

describe('formatValue and formatChange', () => {
  it('formats each metric', () => {
    expect(formatValue('top', 84.878)).toEqual({ number: '84.9', unit: 'lb' });
    expect(formatValue('e1rm', 126.6)).toEqual({ number: '127', unit: 'lb' });
    expect(formatValue('hold', 65)).toEqual({ number: '1:05', unit: '' });
    expect(formatValue('reps', 1)).toEqual({ number: '1', unit: 'rep' });
  });

  it('signs a change, and reports no change as null', () => {
    expect(formatChange('top', 65, 95)).toBe('+30 lb');
    expect(formatChange('top', 95, 90)).toBe('−5 lb');
    expect(formatChange('hold', 30, 45)).toBe('+0:15');
    expect(formatChange('top', 95, 95)).toBeNull();
  });
});

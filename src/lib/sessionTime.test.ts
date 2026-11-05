import { describe, expect, it } from 'vitest';
import type { Session } from '../types';
import { durationMinutes, elapsedMs, finishTime } from './sessionTime';

const MINUTE = 60000;
const DAY = 24 * 60 * MINUTE;

function session(fields: Partial<Session>): Session {
  return {
    id: 's',
    templateId: 'A',
    startedAt: 0,
    finishedAt: null,
    items: [],
    currentIndex: 0,
    ...fields,
  };
}

describe('elapsedMs', () => {
  it('counts from the start of a normal workout', () => {
    expect(elapsedMs(session({}), 10 * MINUTE)).toBe(10 * MINUTE);
  });

  it('skips the gap before a workout was reopened', () => {
    const reopened = { at: 3 * DAY, previousFinishedAt: 40 * MINUTE };
    expect(elapsedMs(session({ reopened }), 3 * DAY + 5 * MINUTE)).toBe(45 * MINUTE);
  });
});

describe('finishTime', () => {
  it('is the current time for a normal workout', () => {
    expect(finishTime(session({}), 50 * MINUTE)).toBe(50 * MINUTE);
  });

  it('keeps a reopened workout on its original date', () => {
    const reopened = { at: 3 * DAY, previousFinishedAt: 40 * MINUTE };
    expect(finishTime(session({ reopened }), 3 * DAY + 5 * MINUTE)).toBe(45 * MINUTE);
  });
});

describe('durationMinutes', () => {
  it('rounds to whole minutes', () => {
    expect(durationMinutes(session({ finishedAt: 48 * MINUTE + 20000 }))).toBe(48);
  });
});

import { describe, expect, it } from 'vitest';
import type { Exercise, LoggedSet, Session } from '../types';
import { parseCsv, readCsv, toCsv } from './csv';

const at = (d: number, h: number, m: number) => new Date(2026, 10, d, h, m).getTime();

const exercises: Exercise[] = [
  { id: 'bench', name: 'Bench Press', type: 'weight' },
  { id: 'plank', name: 'Plank', type: 'timed' },
];
const sessions: Session[] = [
  { id: 'w1', templateId: 'B', startedAt: at(3, 18, 2), finishedAt: at(3, 18, 48), items: [], currentIndex: 0 },
  { id: 'open', templateId: 'A', startedAt: at(5, 9, 0), finishedAt: null, items: [], currentIndex: 0 },
];
const sets: LoggedSet[] = [
  { id: 's1', sessionId: 'w1', exerciseId: 'bench', order: 1, note: 'seat 3, "high"', loggedAt: 0, kind: 'weight', reps: 8, weightValue: 40, weightUnit: 'kg' },
  { id: 's2', sessionId: 'w1', exerciseId: 'bench', order: 2, note: '', loggedAt: 0, kind: 'weight', reps: 7, weightValue: 40, weightUnit: 'kg' },
  { id: 's3', sessionId: 'w1', exerciseId: 'plank', order: 3, note: '', loggedAt: 0, kind: 'timed', durationSec: 45 },
  { id: 's4', sessionId: 'open', exerciseId: 'plank', order: 1, note: '', loggedAt: 0, kind: 'timed', durationSec: 30 },
];

describe('toCsv', () => {
  const csv = toCsv(sessions, sets, exercises);
  const lines = csv.trim().split('\r\n');

  it('writes a header and one row per set of each finished workout', () => {
    expect(lines).toHaveLength(4);
    expect(lines[0]).toBe('workout_id,date,start,end,day,exercise,type,set,reps,weight,unit,weight_lb,seconds,note');
  });

  it('writes the values, pounds and quoted notes', () => {
    expect(lines[1]).toBe('w1,2026-11-03,2026-11-03 18:02,2026-11-03 18:48,B,Bench Press,weight,1,8,40,kg,88.2,,"seat 3, ""high"""');
    expect(lines[2]).toContain(',2,7,40,kg,');
    expect(lines[3]).toContain('Plank,timed,1,,,,,45,');
  });
});

describe('parseCsv', () => {
  it('handles quotes, commas and line breaks inside cells', () => {
    expect(parseCsv('a,"b,c","d ""e""\nf"\r\n1,2,3\n')).toEqual([
      ['a', 'b,c', 'd "e"\nf'],
      ['1', '2', '3'],
    ]);
  });

  it('ignores a leading byte-order mark and blank lines', () => {
    expect(parseCsv('﻿a,b\n\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('readCsv', () => {
  let n = 0;
  const newId = () => `id${++n}`;

  it('reads back what toCsv writes', () => {
    const result = readCsv(toCsv(sessions, sets, exercises), newId);
    if (!result.ok) throw new Error(result.error);
    const { data } = result;
    expect(data.sessions).toHaveLength(1);
    expect(data.sessions[0]).toMatchObject({ id: 'w1', templateId: 'B', startedAt: at(3, 18, 2), finishedAt: at(3, 18, 48) });
    expect(data.sessions[0].items.map((i) => i.targetSets)).toEqual([2, 1]);
    expect(data.exercises.map((e) => [e.name, e.type])).toEqual([
      ['Bench Press', 'weight'],
      ['Plank', 'timed'],
    ]);
    expect(data.sets[0]).toMatchObject({ kind: 'weight', reps: 8, weightValue: 40, weightUnit: 'kg', note: 'seat 3, "high"' });
    expect(data.sets[2]).toMatchObject({ kind: 'timed', durationSec: 45 });
    expect(data.skippedRows).toBe(0);
  });

  it('accepts a hand-made sheet and groups rows by date', () => {
    const result = readCsv('Date,Exercise,Reps,Weight\n2026-10-01,Squat,5,135\n2026-10-01,Squat,5,135\n2026-10-03,Squat,5,140\nbad row', newId);
    if (!result.ok) throw new Error(result.error);
    expect(result.data.sessions).toHaveLength(2);
    expect(result.data.exercises).toHaveLength(1);
    expect(result.data.sets[0]).toMatchObject({ weightUnit: 'lb', weightValue: 135 });
    expect(result.data.skippedRows).toBe(1);
  });

  it('refuses a CSV without the needed columns', () => {
    expect(readCsv('name,score\nx,1').ok).toBe(false);
  });
});

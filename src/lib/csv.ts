// The CSV export (one row per set, for spreadsheets) and reading one back in.
import type { Exercise, LoggedSet, Session, TemplateId, Unit } from '../types';
import { toDateInput, toTimeInput } from './dateInput';
import { formatLb, toLb } from './units';

export const CSV_COLUMNS = [
  'workout_id',
  'date',
  'start',
  'end',
  'day',
  'exercise',
  'type',
  'set',
  'reps',
  'weight',
  'unit',
  'weight_lb',
  'seconds',
  'note',
] as const;

// ---- Writing

function cell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) || text !== text.trim() ? `"${text.replaceAll('"', '""')}"` : text;
}

// "2026-11-05 18:02", in the phone's time zone, which spreadsheets read as a date.
function localDateTime(timestamp: number): string {
  return `${toDateInput(timestamp)} ${toTimeInput(timestamp)}`;
}

// Finished workouts only, oldest first, each workout's sets in the order logged.
export function toCsv(sessions: Session[], sets: LoggedSet[], exercises: Exercise[]): string {
  const names = new Map(exercises.map((e) => [e.id, e]));
  const rows: string[][] = [[...CSV_COLUMNS]];

  const finished = sessions.filter((s) => s.finishedAt !== null).sort((a, b) => a.startedAt - b.startedAt);
  for (const session of finished) {
    const counts = new Map<string, number>();
    const own = sets.filter((s) => s.sessionId === session.id).sort((a, b) => a.order - b.order);
    for (const set of own) {
      const number = (counts.get(set.exerciseId) ?? 0) + 1;
      counts.set(set.exerciseId, number);
      const weight = set.kind === 'weight';
      rows.push(
        [
          session.id,
          toDateInput(session.startedAt),
          localDateTime(session.startedAt),
          localDateTime(session.finishedAt as number),
          session.templateId,
          names.get(set.exerciseId)?.name ?? '',
          set.kind,
          number,
          weight ? set.reps : '',
          weight ? set.weightValue : '',
          weight ? set.weightUnit : '',
          weight ? formatLb(toLb(set.weightValue, set.weightUnit)) : '',
          weight ? '' : set.durationSec,
          set.note,
        ].map(cell),
      );
    }
  }
  return rows.map((row) => row.join(',')).join('\r\n') + '\r\n';
}

// ---- Reading

// Splits CSV text into rows of cells, handling quoted cells with commas, quotes and
// line breaks inside them.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  const input = text.replace(/^﻿/, ''); // the marker some spreadsheets put at the start

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        value += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        value += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(value);
      value = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') i++;
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else {
      value += ch;
    }
  }
  if (value !== '' || row.length > 0) {
    row.push(value);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

// "2026-11-05 18:02" or "2026-11-05" (noon) in the phone's time zone, or null.
function parseLocal(text: string, fallbackDate?: string): number | null {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/.exec(text.trim() || fallbackDate || '');
  if (!match) return null;
  const [, y, m, d, h, min] = match;
  const hasTime = h !== undefined && text.trim() !== '';
  return new Date(+y, +m - 1, +d, hasTime ? +h : 12, hasTime ? +min : 0).getTime();
}

export interface CsvImport {
  exercises: Exercise[];
  sessions: Session[];
  sets: LoggedSet[];
  skippedRows: number;
}

export type CsvResult = { ok: true; data: CsvImport } | { ok: false; error: string };

// Reads a CSV in the export's format. Only the exercise and a date (or start) are
// required, so a spreadsheet typed up by hand works too. Rows that can't be read are
// skipped and counted.
export function readCsv(text: string, newId: () => string = () => crypto.randomUUID()): CsvResult {
  const [header, ...rows] = parseCsv(text);
  const columns = (header ?? []).map((h) => h.trim().toLowerCase());
  const at = (name: string) => columns.indexOf(name);
  if (at('exercise') < 0 || (at('date') < 0 && at('start') < 0)) {
    return { ok: false, error: "This CSV doesn't have the columns this app exports, so it can't be imported." };
  }

  const exercisesByName = new Map<string, Exercise>();
  const sessionsByKey = new Map<string, Session>();
  const sets: LoggedSet[] = [];
  let skippedRows = 0;
  let order = 0;

  for (const row of rows) {
    const get = (name: string) => (at(name) >= 0 ? (row[at(name)] ?? '').trim() : '');
    const name = get('exercise');
    const startedAt = parseLocal(get('start'), get('date'));
    const reps = Number(get('reps'));
    const seconds = Number(get('seconds'));
    const timed = get('type') === 'timed' || (get('reps') === '' && get('seconds') !== '');
    const valid = name !== '' && startedAt !== null && (timed ? seconds > 0 : Number.isInteger(reps) && reps > 0);
    if (!valid) {
      skippedRows++;
      continue;
    }

    const lower = name.toLowerCase();
    let exercise = exercisesByName.get(lower);
    if (!exercise) {
      exercise = { id: newId(), name, type: timed ? 'timed' : 'weight' };
      exercisesByName.set(lower, exercise);
    }

    const day: TemplateId = get('day').toUpperCase() === 'B' ? 'B' : 'A';
    const key = get('workout_id') || `${get('date') || get('start').slice(0, 10)}|${day}`;
    let session = sessionsByKey.get(key);
    if (!session) {
      const end = parseLocal(get('end'));
      session = {
        id: get('workout_id') || newId(),
        templateId: day,
        startedAt,
        finishedAt: end !== null && end > startedAt ? end : startedAt,
        items: [],
        currentIndex: 0,
      };
      sessionsByKey.set(key, session);
    }
    const item = session.items.find((i) => i.exerciseId === exercise.id);
    if (item) item.targetSets++;
    else session.items.push({ exerciseId: exercise.id, targetSets: 1 });

    const unit: Unit = get('unit').toLowerCase() === 'kg' ? 'kg' : 'lb';
    const weight = Number(get('weight'));
    const base = { id: newId(), sessionId: session.id, exerciseId: exercise.id, order: ++order, note: get('note'), loggedAt: startedAt };
    sets.push(
      timed
        ? { ...base, kind: 'timed', durationSec: seconds }
        : { ...base, kind: 'weight', reps, weightValue: Number.isFinite(weight) && weight > 0 ? weight : 0, weightUnit: unit },
    );
  }

  if (sets.length === 0) {
    return { ok: false, error: 'No sets could be read from this CSV.' };
  }
  return {
    ok: true,
    data: { exercises: [...exercisesByName.values()], sessions: [...sessionsByKey.values()], sets, skippedRows },
  };
}

// Converting between saved times and the phone's date and time pickers, which use
// text like "2026-11-05" and "18:02" in the phone's own time zone.

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateInput(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toTimeInput(timestamp: number): string {
  const d = new Date(timestamp);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export type TimesResult =
  | { startedAt: number; finishedAt: number; endsNextDay: boolean }
  | { error: string };

// Works out a workout's start and finish from a date and two times. An end time
// earlier than the start means the workout went past midnight.
export function fromInputs(date: string, start: string, end: string, now: number): TimesResult {
  const [year, month, day] = date.split('-').map(Number);
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  if ([year, month, day, startH, startM, endH, endM].some((n) => !Number.isFinite(n))) {
    return { error: 'Enter a date, a start time and an end time.' };
  }

  const startedAt = new Date(year, month - 1, day, startH, startM).getTime();
  const sameDayEnd = new Date(year, month - 1, day, endH, endM).getTime();
  if (sameDayEnd === startedAt) return { error: 'The end time must be after the start time.' };

  const endsNextDay = sameDayEnd < startedAt;
  const finishedAt = endsNextDay ? new Date(year, month - 1, day + 1, endH, endM).getTime() : sameDayEnd;
  if (finishedAt > now) return { error: "The workout can't end in the future." };

  return { startedAt, finishedAt, endsNextDay };
}

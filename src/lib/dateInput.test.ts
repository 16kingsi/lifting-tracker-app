import { describe, expect, it } from 'vitest';
import { fromInputs, toDateInput, toTimeInput } from './dateInput';

// Built from local time, so the tests pass in any time zone.
const NOW = new Date(2026, 10, 5, 20, 0).getTime();

describe('toDateInput and toTimeInput', () => {
  it('give the picker formats, with leading zeros', () => {
    const t = new Date(2026, 2, 7, 6, 5).getTime();
    expect(toDateInput(t)).toBe('2026-03-07');
    expect(toTimeInput(t)).toBe('06:05');
  });
});

describe('fromInputs', () => {
  it('builds the start and finish on the chosen day', () => {
    expect(fromInputs('2026-11-03', '18:02', '18:48', NOW)).toEqual({
      startedAt: new Date(2026, 10, 3, 18, 2).getTime(),
      finishedAt: new Date(2026, 10, 3, 18, 48).getTime(),
      endsNextDay: false,
    });
  });

  it('treats an earlier end time as the next day', () => {
    const result = fromInputs('2026-11-03', '23:30', '00:15', NOW);
    expect(result).toEqual({
      startedAt: new Date(2026, 10, 3, 23, 30).getTime(),
      finishedAt: new Date(2026, 10, 4, 0, 15).getTime(),
      endsNextDay: true,
    });
  });

  it('rejects matching times, the future and empty fields', () => {
    expect(fromInputs('2026-11-03', '18:00', '18:00', NOW)).toHaveProperty('error');
    expect(fromInputs('2026-11-05', '19:30', '20:30', NOW)).toHaveProperty('error');
    expect(fromInputs('', '18:00', '19:00', NOW)).toHaveProperty('error');
    expect(fromInputs('2026-11-03', '', '19:00', NOW)).toHaveProperty('error');
  });
});

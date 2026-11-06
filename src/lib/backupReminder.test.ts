import { describe, expect, it } from 'vitest';
import { backupOverdue, formatAgo, showBackupBanner } from './backupReminder';

const DAY = 86400000;
const base = {
  backupIntervalDays: 14,
  lastExportAt: null,
  firstRunAt: 0,
  bannerDismissedAt: null,
  workoutsSinceExport: 3,
};

describe('showBackupBanner', () => {
  it('waits for the interval since first use when never backed up', () => {
    expect(showBackupBanner(base, 13 * DAY)).toBe(false);
    expect(showBackupBanner(base, 14 * DAY)).toBe(true);
  });

  it('counts from the last backup', () => {
    expect(showBackupBanner({ ...base, lastExportAt: 10 * DAY }, 20 * DAY)).toBe(false);
    expect(showBackupBanner({ ...base, lastExportAt: 10 * DAY }, 24 * DAY)).toBe(true);
  });

  it('stays away when nothing is new, or reminders are off', () => {
    expect(showBackupBanner({ ...base, workoutsSinceExport: 0 }, 99 * DAY)).toBe(false);
    expect(showBackupBanner({ ...base, backupIntervalDays: null }, 99 * DAY)).toBe(false);
  });

  it('waits another interval after being dismissed', () => {
    const dismissed = { ...base, bannerDismissedAt: 20 * DAY };
    expect(showBackupBanner(dismissed, 30 * DAY)).toBe(false);
    expect(showBackupBanner(dismissed, 34 * DAY)).toBe(true);
    expect(backupOverdue(dismissed, 30 * DAY)).toBe(true);
  });
});

describe('formatAgo', () => {
  const now = new Date(2026, 10, 6, 9, 0).getTime();

  it('counts calendar days', () => {
    expect(formatAgo(new Date(2026, 10, 6, 1, 0).getTime(), now)).toBe('today');
    expect(formatAgo(new Date(2026, 10, 5, 23, 0).getTime(), now)).toBe('yesterday');
    expect(formatAgo(new Date(2026, 9, 19, 12, 0).getTime(), now)).toBe('18 days ago');
  });
});

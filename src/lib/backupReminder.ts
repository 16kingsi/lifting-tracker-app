// When to remind about backing up. Data lives only on the phone, so a backup is the
// only copy if the phone is lost or its browser data is cleared.
import type { Settings } from '../types';

const DAY = 86400000;

type ReminderSettings = Pick<
  Settings,
  'backupIntervalDays' | 'lastExportAt' | 'firstRunAt' | 'bannerDismissedAt' | 'workoutsSinceExport'
>;

// The reminder is due once the chosen interval has passed since the last backup (or
// since first use), with at least one workout not yet backed up. Dismissing it waits
// another interval.
export function showBackupBanner(settings: ReminderSettings, now: number): boolean {
  const { backupIntervalDays, lastExportAt, firstRunAt, bannerDismissedAt, workoutsSinceExport } = settings;
  if (backupIntervalDays === null || workoutsSinceExport === 0) return false;
  const from = Math.max(lastExportAt ?? firstRunAt, bannerDismissedAt ?? 0);
  return now - from >= backupIntervalDays * DAY;
}

// Whether the last backup is older than the chosen interval, ignoring dismissals.
export function backupOverdue(settings: ReminderSettings, now: number): boolean {
  const { backupIntervalDays, lastExportAt, firstRunAt, workoutsSinceExport } = settings;
  if (backupIntervalDays === null || workoutsSinceExport === 0) return false;
  return now - (lastExportAt ?? firstRunAt) >= backupIntervalDays * DAY;
}

// "today", "yesterday", "18 days ago", counting calendar days.
export function formatAgo(timestamp: number, now: number): string {
  const startOfDay = (t: number) => new Date(t).setHours(0, 0, 0, 0);
  const days = Math.round((startOfDay(now) - startOfDay(timestamp)) / DAY);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

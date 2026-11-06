// The export buttons, shared by Settings and the backup reminder on Home.
import { markBackedUp, readBackupFile, readCsv } from '../../db/backup';
import { toDateInput } from '../../lib/dateInput';
import { shareOrDownload, type ShareResult } from '../../shareFile';

// A full backup. Once it has been shared or saved, the reminder starts again.
export async function exportJson(): Promise<ShareResult> {
  const file = await readBackupFile();
  const result = await shareOrDownload(
    `lifting-backup-${toDateInput(Date.now())}.json`,
    JSON.stringify(file, null, 1),
    'application/json',
  );
  if (result !== 'cancelled') await markBackedUp();
  return result;
}

// For spreadsheets. It leaves out the routine, so it doesn't count as a backup.
export async function exportCsv(): Promise<ShareResult> {
  return shareOrDownload(`lifting-sets-${toDateInput(Date.now())}.csv`, await readCsv(), 'text/csv');
}

export function describeResult(result: ShareResult, what: string): string {
  if (result === 'shared') return `${what} shared.`;
  if (result === 'downloaded') return `${what} saved to Downloads.`;
  return '';
}

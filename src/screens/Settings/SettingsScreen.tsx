import { useRef, useState, type ChangeEvent } from 'react';
import { DownloadIcon, PhoneIcon, ShareIcon, TableIcon, UploadIcon } from '../../components/Icons';
import { Loading } from '../../components/Loading';
import { setBackupInterval } from '../../db/backup';
import { getSettings } from '../../db/queries';
import { setDefaultUnit } from '../../db/routine';
import { useData } from '../../db/useData';
import { parseBackupFile } from '../../lib/backupFile';
import { backupOverdue, formatAgo } from '../../lib/backupReminder';
import { readCsv } from '../../lib/csv';
import { formatShortDate, plural } from '../../lib/format';
import type { ShareResult } from '../../shareFile';
import type { Unit } from '../../types';
import { describeResult, exportCsv, exportJson } from './exportActions';
import { ImportSheet, type Incoming } from './ImportSheet';
import './settings.css';

const UNITS: Unit[] = ['lb', 'kg'];
const INTERVALS: Array<{ days: number | null; label: string }> = [
  { days: 7, label: '1 wk' },
  { days: 14, label: '2 wks' },
  { days: 30, label: 'Month' },
  { days: null, label: 'Off' },
];

export function SettingsScreen() {
  const settings = useData(getSettings);
  const [busy, setBusy] = useState(false);
  const [backupMessage, setBackupMessage] = useState('');
  const [dataMessage, setDataMessage] = useState('');
  const [incoming, setIncoming] = useState<Incoming | null>(null);
  const filePicker = useRef<HTMLInputElement>(null);

  if (!settings) return <Loading />;

  const now = Date.now();
  const { lastExportAt, workoutsSinceExport } = settings;

  // Runs an export, then says what happened under the button that started it.
  async function run(action: () => Promise<ShareResult>, what: string, show: (message: string) => void) {
    setBusy(true);
    setBackupMessage('');
    setDataMessage('');
    try {
      show(describeResult(await action(), what));
    } catch {
      show(`Couldn't export. Try again, or close and reopen the app.`);
    } finally {
      setBusy(false);
    }
  }

  async function readChosenFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // so choosing the same file again still works
    if (!file) return;
    setBackupMessage('');
    setDataMessage('');

    let text: string;
    try {
      text = await file.text();
    } catch {
      setDataMessage("Couldn't open that file. Try saving it to the phone first, then import it again.");
      return;
    }
    // Decided by what's inside, since a backup may have been shared as .txt.
    if (text.trimStart().startsWith('{')) {
      const result = parseBackupFile(text);
      if (result.ok) setIncoming({ kind: 'json', fileName: file.name, file: result.file, skipped: result.skipped });
      else setDataMessage(result.error);
    } else {
      const result = readCsv(text);
      if (result.ok) setIncoming({ kind: 'csv', fileName: file.name, data: result.data });
      else setDataMessage(result.error);
    }
  }

  return (
    <>
      <h1 className="page-title">Settings</h1>
      <div className="settings">
        <section className="settings__section">
          <h2 className="settings__heading">Units</h2>
          <div className="settings__card">
            <div className="settings__row">
              <span className="settings__text">
                <span className="settings__label">Default unit</span>
                <span className="settings__detail">You can still switch any single set</span>
              </span>
              <span role="radiogroup" aria-label="Default unit" className="segmented settings__units">
                {UNITS.map((unit) => (
                  <button
                    key={unit}
                    role="radio"
                    aria-checked={settings.defaultUnit === unit}
                    className="segmented__option"
                    onClick={() => setDefaultUnit(unit)}
                  >
                    {unit}
                  </button>
                ))}
              </span>
            </div>
            <p className="settings__detail">Charts and comparisons always use pounds.</p>
          </div>
        </section>

        <section className="settings__section">
          <h2 className="settings__heading">Backup</h2>
          <div className="settings__card settings__card--roomy">
            <div className="settings__row settings__row--baseline">
              <span className="settings__label">Last backup</span>
              <span className={`settings__value ${backupOverdue(settings, now) ? 'settings__value--overdue' : ''}`}>
                {lastExportAt ? `${formatShortDate(lastExportAt)} · ${formatAgo(lastExportAt, now)}` : 'Never'}
              </span>
            </div>
            {workoutsSinceExport > 0 && (
              <p className="settings__detail">
                {plural(workoutsSinceExport, 'workout')} {lastExportAt ? 'since then' : 'not backed up yet'}
              </p>
            )}

            <span className="settings__subhead">Remind me every</span>
            <div role="radiogroup" aria-label="Backup reminder frequency" className="segmented settings__intervals">
              {INTERVALS.map(({ days, label }) => (
                <button
                  key={label}
                  role="radio"
                  aria-checked={settings.backupIntervalDays === days}
                  className="segmented__option"
                  onClick={() => setBackupInterval(days)}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              className="btn btn--primary settings__backup"
              disabled={busy}
              onClick={() => run(exportJson, 'Backup', setBackupMessage)}
            >
              <ShareIcon />
              Back up now (share JSON)
            </button>
            {backupMessage && (
              <p className="settings__detail" role="status">
                {backupMessage}
              </p>
            )}
          </div>
        </section>

        <section className="settings__section">
          <h2 className="settings__heading">Data</h2>
          <div className="settings__list">
            <button
              className="settings__item"
              disabled={busy}
              onClick={() => run(exportJson, 'Backup', setDataMessage)}
            >
              <DownloadIcon />
              <span className="settings__text">
                <span className="settings__label">Export as JSON</span>
                <span className="settings__detail">Full backup, can be imported again</span>
              </span>
            </button>
            <button
              className="settings__item"
              disabled={busy}
              onClick={() => run(exportCsv, 'CSV', setDataMessage)}
            >
              <TableIcon />
              <span className="settings__text">
                <span className="settings__label">Export as CSV</span>
                <span className="settings__detail">One row per set, for spreadsheets</span>
              </span>
            </button>
            <button className="settings__item" disabled={busy} onClick={() => filePicker.current?.click()}>
              <UploadIcon />
              <span className="settings__text">
                <span className="settings__label">Import data</span>
                <span className="settings__detail">JSON or CSV · shows a preview before replacing</span>
              </span>
            </button>
          </div>
          {dataMessage && (
            <p className="settings__detail settings__message" role="status">
              {dataMessage}
            </p>
          )}
          <input
            ref={filePicker}
            type="file"
            accept=".json,.csv,.txt,application/json,text/csv,text/plain"
            className="visually-hidden"
            tabIndex={-1}
            aria-hidden="true"
            onChange={readChosenFile}
          />
        </section>

        <section aria-label="About storage" className="settings__about">
          <PhoneIcon />
          <p>
            Everything is stored only on this phone. There is no account and nothing is uploaded.
            Clearing browser data or uninstalling the app deletes your history, so keep a recent
            backup.
          </p>
        </section>
      </div>

      {incoming && <ImportSheet incoming={incoming} onClose={() => setIncoming(null)} />}
    </>
  );
}

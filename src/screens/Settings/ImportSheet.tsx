import { useState } from 'react';
import { Sheet } from '../../components/Sheet';
import { applyMerge, loadMergeContext, replaceEverything } from '../../db/backup';
import { useData } from '../../db/useData';
import { planMerge, summarize, type BackupFile } from '../../lib/backupFile';
import type { CsvImport } from '../../lib/csv';
import { formatDate, formatShortDate, plural } from '../../lib/format';

// A file that has been read and checked, waiting for the person to choose what to do.
export type Incoming =
  | { kind: 'json'; fileName: string; file: BackupFile; skipped: number }
  | { kind: 'csv'; fileName: string; data: CsvImport };

type Step = 'choose' | 'confirm-replace' | { done: string };

// Shows what's in the file and what merging or replacing would do, before doing it.
export function ImportSheet({ incoming, onClose }: { incoming: Incoming; onClose: () => void }) {
  const here = useData(loadMergeContext);
  const [step, setStep] = useState<Step>('choose');
  const [working, setWorking] = useState(false);

  if (!here) return null;

  const data = incoming.kind === 'json' ? incoming.file : incoming.data;
  const skipped = incoming.kind === 'json' ? incoming.skipped : incoming.data.skippedRows;
  const summary = summarize(data);
  const plan = planMerge(here, data);

  async function act(work: () => Promise<void>, done: string) {
    setWorking(true);
    try {
      await work();
      setStep({ done });
    } catch {
      setStep({ done: 'Something went wrong, so nothing was imported. Nothing on this phone changed.' });
    } finally {
      setWorking(false);
    }
  }

  if (typeof step === 'object') {
    return (
      <Sheet label="Import finished" onClose={onClose}>
        <h2 className="sheet__title">Import finished</h2>
        <p className="sheet__text">{step.done}</p>
        <button className="btn btn--primary" onClick={onClose}>
          Done
        </button>
      </Sheet>
    );
  }

  if (step === 'confirm-replace' && incoming.kind === 'json') {
    return (
      <Sheet label="Replace everything" onClose={() => setStep('choose')}>
        <h2 className="sheet__title">Replace everything?</h2>
        <p className="sheet__text">
          This can't be undone. If you might want what's on this phone now, back it up first.
        </p>
        <button
          className="btn btn--danger"
          disabled={working}
          onClick={() =>
            act(
              () => replaceEverything(incoming.file),
              `Replaced. This phone now has ${plural(summary.workouts, 'workout')} from the backup.`,
            )
          }
        >
          Yes, replace everything
        </button>
        <button className="btn btn--outline" onClick={() => setStep('choose')}>
          Go back
        </button>
      </Sheet>
    );
  }

  const range =
    summary.first !== null && summary.last !== null
      ? summary.first === summary.last
        ? ` (${formatShortDate(summary.last)})`
        : ` (${formatShortDate(summary.first)} – ${formatShortDate(summary.last)})`
      : '';
  const exported = incoming.kind === 'json' ? Date.parse(incoming.file.exportedAt) : NaN;

  return (
    <Sheet label="Import data" onClose={onClose}>
      <h2 className="sheet__title import__title">Import {incoming.fileName}</h2>
      <p className="sheet__text">
        {incoming.kind === 'json'
          ? `Backup${Number.isNaN(exported) ? '' : ` from ${formatDate(exported)}`}`
          : 'Spreadsheet'}{' '}
        with {plural(summary.workouts, 'workout')}
        {range} and {plural(summary.sets, 'set')}.
        {skipped > 0 &&
          ` ${plural(skipped, incoming.kind === 'json' ? 'damaged entry' : 'row')} couldn't be read and will be left out.`}
      </p>

      <section className="import__option">
        <h3 className="import__heading">Merge</h3>
        <p className="sheet__text">
          {plan.sessions.length > 0
            ? `Adds ${plural(plan.sessions.length, 'workout')} and ${plural(plan.sets.length, 'set')} that aren't on this phone. Nothing here is changed or removed.`
            : 'Every workout in this file is already on this phone.'}
          {plan.sessions.length > 0 && plan.alreadyHere > 0 && ` ${plural(plan.alreadyHere, 'workout')} already here will be left as they are.`}
          {plan.skippedInProgress > 0 && ' The workout in progress in the file is left out.'}
        </p>
        <button
          className="btn btn--primary"
          disabled={working || plan.sessions.length === 0}
          onClick={() =>
            act(
              () => applyMerge(plan),
              `Added ${plural(plan.sessions.length, 'workout')} and ${plural(plan.sets.length, 'set')}.`,
            )
          }
        >
          Merge into this phone
        </button>
      </section>

      {incoming.kind === 'json' ? (
        <section className="import__option">
          <h3 className="import__heading">Replace</h3>
          <p className="sheet__text">
            Deletes everything on this phone ({plural(here.finishedCount, 'workout')}
            {here.hasActive ? ' and the workout in progress' : ''}, your routine and settings) and puts the
            backup in its place.
          </p>
          <button className="btn btn--danger" disabled={working} onClick={() => setStep('confirm-replace')}>
            Replace everything
          </button>
        </section>
      ) : (
        <p className="sheet__text import__note">
          A CSV can only be merged, because it doesn't include your routine or settings.
        </p>
      )}

      <button className="btn btn--outline" onClick={onClose}>
        Cancel
      </button>
    </Sheet>
  );
}

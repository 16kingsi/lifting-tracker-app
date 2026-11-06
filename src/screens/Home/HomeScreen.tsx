import { useState } from 'react';
import { ChevronRightIcon, CloseIcon, PlayIcon, ShareIcon, WarningIcon } from '../../components/Icons';
import { Loading } from '../../components/Loading';
import { Sheet } from '../../components/Sheet';
import { useNow } from '../../components/useNow';
import { loadHome, type FinishedWorkout, type HomeData } from '../../db/queries';
import { useData } from '../../db/useData';
import { dismissBackupBanner } from '../../db/backup';
import { discardSession, startSession } from '../../db/workouts';
import { formatAgo, showBackupBanner } from '../../lib/backupReminder';
import { formatDate, formatDuration, formatLongDate, plural } from '../../lib/format';
import { nextTemplateId } from '../../lib/rotation';
import { durationMinutes, elapsedMs } from '../../lib/sessionTime';
import { navigate, replaceScreen } from '../../router';
import type { Session, Settings, TemplateId } from '../../types';
import { exportJson } from '../Settings/exportActions';
import './home.css';

export function HomeScreen() {
  const home = useData(loadHome);
  if (!home) return <Loading />;

  return (
    <div className="home">
      <header className="home__header">
        <p className="home__date">{formatLongDate(Date.now())}</p>
        <h1 className="home__title">Ready to lift</h1>
      </header>
      {showBackupBanner(home.settings, Date.now()) && <BackupBanner settings={home.settings} />}
      {home.active ? (
        <ResumeCard session={home.active} setCount={home.activeSetCount} />
      ) : (
        <UpNextCard home={home} />
      )}
      {home.recent.length > 0 && <RecentSessions workouts={home.recent} />}
    </div>
  );
}

function BackupBanner({ settings }: { settings: Settings }) {
  const [busy, setBusy] = useState(false);

  async function backUp() {
    setBusy(true);
    try {
      await exportJson(); // the banner goes away by itself once the backup is saved
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="status" className="backup-banner">
      <WarningIcon />
      <p className="backup-banner__text">
        {settings.lastExportAt ? (
          <>
            Last backup: <strong>{formatAgo(settings.lastExportAt, Date.now())}</strong>
          </>
        ) : (
          <strong>Not backed up yet</strong>
        )}
      </p>
      <button className="backup-banner__action" disabled={busy} onClick={backUp}>
        <ShareIcon size={18} />
        Back up now
      </button>
      <button
        aria-label="Dismiss backup reminder"
        className="backup-banner__action backup-banner__dismiss"
        onClick={dismissBackupBanner}
      >
        <CloseIcon size={20} />
      </button>
    </div>
  );
}

function UpNextCard({ home }: { home: HomeData }) {
  const last = home.finished[0];
  const next = nextTemplateId(last?.templateId ?? null);
  const other: TemplateId = next === 'A' ? 'B' : 'A';
  const itemsFor = (id: TemplateId) => home.templates.find((t) => t.id === id)?.items ?? [];
  const items = itemsFor(next);
  const minutes = typicalMinutes(home.finished, next);

  async function start(templateId: TemplateId) {
    await startSession(templateId);
    navigate('/workout');
  }

  return (
    <section className="home-card">
      <div className="home-card__top">
        <p className="home-card__label">Up next in rotation</p>
        {last?.finishedAt && <p className="home-card__meta">Last: {formatDate(last.finishedAt)}</p>}
      </div>

      <div className="home-card__day">
        <div className="home-card__badge mono">{next}</div>
        <div>
          <h2 className="home-card__name">Day {next}</h2>
          <p className="home-card__meta">
            {plural(items.length, 'exercise')}
            {minutes ? ` · about ${minutes} min` : ''}
          </p>
        </div>
      </div>

      {items.length > 0 ? (
        <ol className="home-card__exercises">
          {items.map((item) => {
            const exercise = home.exercisesById.get(item.exerciseId);
            return (
              <li key={item.exerciseId}>
                {exercise?.name}
                {exercise?.type === 'timed' && <span className="home-card__timed"> · timed</span>}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="home-card__meta">Add exercises to Day {next} in Routine to start it.</p>
      )}

      <button className="btn btn--primary" disabled={items.length === 0} onClick={() => start(next)}>
        <PlayIcon />
        Start Day {next}
      </button>
      <button
        className="btn btn--outline"
        disabled={itemsFor(other).length === 0}
        onClick={() => start(other)}
      >
        Start Day {other} instead
      </button>
    </section>
  );
}

function ResumeCard({ session, setCount }: { session: Session; setCount: number }) {
  const [confirming, setConfirming] = useState(false);
  const now = useNow(1000);

  return (
    <section className="home-card">
      <p className="home-card__label">Workout in progress</p>

      <div className="home-card__day">
        <div className="home-card__badge mono">{session.templateId}</div>
        <div>
          <h2 className="home-card__name">Day {session.templateId}</h2>
          <p className="home-card__meta">
            {plural(setCount, 'set')} logged ·{' '}
            <span className="mono">{formatDuration(elapsedMs(session, now) / 1000)}</span> elapsed
          </p>
        </div>
      </div>

      <button className="btn btn--primary" onClick={() => navigate('/workout')}>
        <PlayIcon />
        Resume Day {session.templateId}
      </button>
      <button className="btn btn--outline" onClick={() => setConfirming(true)}>
        Discard workout
      </button>

      {confirming && (
        <Sheet label="Discard workout" onClose={() => setConfirming(false)}>
          <h2 className="sheet__title">Discard this workout?</h2>
          <p className="sheet__text">{discardWarning(session, setCount)}</p>
          <button className="btn btn--danger" onClick={() => discardSession(session.id)}>
            Discard workout
          </button>
          <button className="btn btn--outline" onClick={() => setConfirming(false)}>
            Keep it
          </button>
        </Sheet>
      )}
    </section>
  );
}

function discardWarning(session: Session, setCount: number): string {
  if (session.reopened) {
    const date = formatDate(session.reopened.previousFinishedAt);
    return `You reopened this workout from ${date}. Discarding it deletes all ${plural(setCount, 'set')}, including the ones from before you reopened it. To keep them, resume it and tap Finish.`;
  }
  return setCount > 0
    ? `This permanently deletes the ${plural(setCount, 'set')} logged in it.`
    : 'No sets have been logged yet.';
}

function RecentSessions({ workouts }: { workouts: FinishedWorkout[] }) {
  return (
    <section className="recent">
      <div className="recent__header">
        <h2 className="recent__title">Recent sessions</h2>
        <button className="recent__all" onClick={() => replaceScreen('/history')}>
          See all
        </button>
      </div>
      {workouts.map(({ session, sets }) => {
        const exerciseCount = new Set(sets.map((s) => s.exerciseId)).size;
        return (
          <button
            key={session.id}
            className="recent__row"
            onClick={() => replaceScreen(`/history/${session.id}`)}
          >
            <span className="day-chip mono">{session.templateId}</span>
            <span className="recent__text">
              <span className="recent__date">{formatDate(session.finishedAt ?? 0)}</span>
              <span className="recent__summary">
                {plural(exerciseCount, 'exercise')} · {plural(sets.length, 'set')} ·{' '}
                {durationMinutes(session)} min
              </span>
            </span>
            <ChevronRightIcon size={20} />
          </button>
        );
      })}
    </section>
  );
}

// How long this day usually takes, from its last few workouts.
function typicalMinutes(finished: Session[], templateId: TemplateId): number | null {
  const recent = finished.filter((s) => s.templateId === templateId).slice(0, 5);
  if (recent.length === 0) return null;
  const totalMs = recent.reduce((sum, s) => sum + ((s.finishedAt ?? 0) - s.startedAt), 0);
  return Math.round(totalMs / recent.length / 60000);
}

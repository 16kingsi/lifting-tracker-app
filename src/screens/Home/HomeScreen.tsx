import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { PlayIcon } from '../../components/Icons';
import { Sheet } from '../../components/Sheet';
import { useNow } from '../../components/useNow';
import { loadHome, type HomeData } from '../../db/queries';
import { discardSession, startSession } from '../../db/workouts';
import { formatDate, formatDuration, formatLongDate } from '../../lib/format';
import { nextTemplateId } from '../../lib/rotation';
import { navigate } from '../../router';
import type { Session, TemplateId } from '../../types';
import './home.css';

// The start of the Home screen. Recent sessions, the backup banner and the bottom
// navigation arrive in later stages.
export function HomeScreen() {
  const home = useLiveQuery(loadHome);
  if (!home) return <div className="screen" />;

  return (
    <div className="screen home">
      <header className="home__header">
        <p className="home__date">{formatLongDate(Date.now())}</p>
        <h1 className="home__title">Ready to lift</h1>
      </header>
      {home.active ? (
        <ResumeCard session={home.active} setCount={home.activeSetCount} />
      ) : (
        <UpNextCard home={home} />
      )}
    </div>
  );
}

function UpNextCard({ home }: { home: HomeData }) {
  const last = home.finished[0];
  const next = nextTemplateId(last?.templateId ?? null);
  const other: TemplateId = next === 'A' ? 'B' : 'A';
  const items = home.templates.find((t) => t.id === next)?.items ?? [];
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
            {items.length} exercises{minutes ? ` · about ${minutes} min` : ''}
          </p>
        </div>
      </div>

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

      <button className="btn btn--primary" disabled={items.length === 0} onClick={() => start(next)}>
        <PlayIcon />
        Start Day {next}
      </button>
      <button className="btn btn--outline" onClick={() => start(other)}>
        Start Day {other} instead
      </button>
    </section>
  );
}

function ResumeCard({ session, setCount }: { session: Session; setCount: number }) {
  const [confirming, setConfirming] = useState(false);
  const now = useNow(1000);
  const elapsed = (now - session.startedAt) / 1000;

  return (
    <section className="home-card">
      <p className="home-card__label">Workout in progress</p>

      <div className="home-card__day">
        <div className="home-card__badge mono">{session.templateId}</div>
        <div>
          <h2 className="home-card__name">Day {session.templateId}</h2>
          <p className="home-card__meta">
            {setCount} {setCount === 1 ? 'set' : 'sets'} logged ·{' '}
            <span className="mono">{formatDuration(elapsed)}</span> elapsed
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
          <p className="sheet__text">
            {setCount > 0
              ? `This permanently deletes the ${setCount} ${setCount === 1 ? 'set' : 'sets'} logged in it.`
              : 'No sets have been logged yet.'}
          </p>
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

// How long this day usually takes, from its last few workouts.
function typicalMinutes(finished: Session[], templateId: TemplateId): number | null {
  const recent = finished.filter((s) => s.templateId === templateId).slice(0, 5);
  if (recent.length === 0) return null;
  const totalMs = recent.reduce((sum, s) => sum + ((s.finishedAt ?? 0) - s.startedAt), 0);
  return Math.round(totalMs / recent.length / 60000);
}

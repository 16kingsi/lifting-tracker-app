import { useState } from 'react';
import { ChevronDownIcon, ChevronLeftIcon } from '../../components/Icons';
import { Loading } from '../../components/Loading';
import { Sheet } from '../../components/Sheet';
import { getLoggedExercises, loadProgress, type ProgressData } from '../../db/queries';
import { useData } from '../../db/useData';
import { formatShortDate, plural, summarizeSets } from '../../lib/format';
import {
  estimateOneRepMax,
  formatChange,
  formatValue,
  METRIC_NAMES,
  metricsFor,
  pointsInRange,
  progressPoints,
  type Metric,
  type Range,
} from '../../lib/progress';
import { formatLb, toLb } from '../../lib/units';
import { leaveScreen, replaceScreen } from '../../router';
import type { LoggedSet, Session } from '../../types';
import { ProgressChart } from './ProgressChart';
import './progress.css';

const RANGES: Range[] = ['1M', '3M', 'All'];
const RANGE_NAMES: Record<Range, string> = { '1M': 'the last month', '3M': 'the last 3 months', All: '' };

export function ProgressScreen({ exerciseId }: { exerciseId: string }) {
  const data = useData(() => loadProgress(exerciseId), [exerciseId]);
  const [choosing, setChoosing] = useState(false);

  return (
    <div className="screen progress">
      <header className="progress__header">
        <button aria-label="Back" className="icon-button" onClick={() => leaveScreen()}>
          <ChevronLeftIcon />
        </button>
        <button className="progress__name" onClick={() => setChoosing(true)}>
          <span>{data?.exercise?.name ?? ''}</span>
          <ChevronDownIcon size={18} width={2.2} />
        </button>
      </header>

      {!data ? <Loading /> : <ProgressBody data={data} />}

      {choosing && <ExerciseChooser currentId={exerciseId} onClose={() => setChoosing(false)} />}
    </div>
  );
}

function ProgressBody({ data }: { data: ProgressData }) {
  const { exercise, sessions, sets, inProgressSets } = data;
  const metrics = metricsFor(exercise?.type ?? 'weight', sets);
  const [chosenMetric, setMetric] = useState<Metric>(metrics[0]);
  const metric = metrics.includes(chosenMetric) ? chosenMetric : metrics[0];
  const [range, setRange] = useState<Range>('3M');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!exercise) {
    return <p className="progress__empty">This exercise no longer exists.</p>;
  }

  const allPoints = progressPoints(sessions, sets, metric);
  const points = pointsInRange(allPoints, range, Date.now());
  const found = points.findIndex((p) => p.sessionId === selectedId);
  const selected = found >= 0 ? found : points.length - 1;
  const point = points[selected];
  const isWeight = metric === 'top' || metric === 'e1rm';

  const todayNote = inProgressSets > 0 && (
    <p className="progress__note">
      Today's {plural(inProgressSets, 'set')} will show here once you finish the workout.
    </p>
  );

  if (allPoints.length === 0) {
    return (
      <div className="progress__body">
        <p className="progress__empty">
          No finished workouts with {exercise.name} yet. Its progress shows here after the first one.
        </p>
        {todayNote}
      </div>
    );
  }

  const hero = point && formatValue(metric, point.value);
  const change = point && selected > 0 ? formatChange(metric, points[0].value, point.value) : null;

  return (
    <div className="progress__body">
      {metrics.length > 1 && (
        <div role="group" aria-label="Measure" className="progress__metrics">
          {metrics.map((m) => (
            <button
              key={m}
              aria-pressed={m === metric}
              className="progress__metric"
              onClick={() => setMetric(m)}
            >
              {METRIC_NAMES[m].button}
            </button>
          ))}
        </div>
      )}

      <section className="progress__card" aria-label="Chart">
        {point ? (
          <>
            <div className="progress__hero">
              <div className="progress__hero-text">
                <span className="progress__hero-label">
                  {METRIC_NAMES[metric].label} · {formatShortDate(point.date)}
                </span>
                <span className="progress__hero-value mono">
                  {hero.number}
                  {hero.unit && <span className="progress__hero-unit"> {hero.unit}</span>}
                </span>
              </div>
              {selected > 0 && (
                <span className="progress__change mono">
                  {change ?? 'No change'} since {formatShortDate(points[0].date)}
                </span>
              )}
            </div>
            <ProgressChart
              points={points}
              metric={metric}
              selected={selected}
              onSelect={(i) => setSelectedId(points[i].sessionId)}
            />
          </>
        ) : (
          <p className="progress__empty">No workouts with {exercise.name} in {RANGE_NAMES[range]}.</p>
        )}

        <div className="progress__footer">
          <span className="progress__key">
            {isWeight && points.some((p) => p.loggedInKg) && (
              <>
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                  <circle className="chart__dot chart__dot--kg" cx="6" cy="6" r="4" />
                </svg>
                Logged in kg, shown in lb
              </>
            )}
          </span>
          <span role="group" aria-label="Time range" className="progress__ranges">
            {RANGES.map((r) => (
              <button
                key={r}
                aria-pressed={r === range}
                className="progress__range"
                onClick={() => setRange(r)}
              >
                {r}
              </button>
            ))}
          </span>
        </div>
      </section>

      {todayNote}

      <section className="progress__past">
        <h2 className="progress__past-title">Past sessions</h2>
        {[...sessions]
          .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0))
          .map((session) => (
            <PastSession
              key={session.id}
              session={session}
              sets={sets.filter((s) => s.sessionId === session.id).sort((a, b) => a.order - b.order)}
              metric={metric}
            />
          ))}
      </section>
    </div>
  );
}

function PastSession({ session, sets, metric }: { session: Session; sets: LoggedSet[]; metric: Metric }) {
  const lifts = sets.filter((s) => s.kind === 'weight');
  const kgLifts = lifts.filter((s) => s.weightUnit === 'kg');
  const notes = [...new Set(sets.map((s) => s.note).filter(Boolean))];

  // Pounds for sets entered in kg, then any notes.
  const kgText =
    kgLifts.length > 0
      ? `≈ ${[...new Set(kgLifts.map((s) => formatLb(toLb(s.weightValue, 'kg'))))].join(', ')} lb`
      : null;
  const sub = [kgText, ...notes.map((n) => `“${n}”`)].filter(Boolean).join(' · ');

  let best = '';
  if (metric === 'top' || metric === 'e1rm') {
    const max = Math.max(...lifts.map((s) => estimateOneRepMax(toLb(s.weightValue, s.weightUnit), s.reps)));
    if (max > 0) best = `1RM ${Math.round(max)}`;
  } else if (metric === 'hold' || metric === 'reps') {
    const values = sets.map((s) => (s.kind === 'timed' ? s.durationSec : s.reps));
    if (values.length) best = `Best ${formatValue(metric, Math.max(...values)).number}`;
  }

  return (
    <div className="past-session">
      <span className="past-session__date">{formatShortDate(session.finishedAt ?? 0)}</span>
      <span className="past-session__text">
        <span className="past-session__sets mono">{summarizeSets(sets)}</span>
        {sub && <span className="past-session__sub mono">{sub}</span>}
      </span>
      {best && <span className="past-session__best mono">{best}</span>}
    </div>
  );
}

function ExerciseChooser({ currentId, onClose }: { currentId: string; onClose: () => void }) {
  const exercises = useData(getLoggedExercises) ?? [];

  return (
    <Sheet label="Choose an exercise" onClose={onClose} className="swap">
      <h2 className="sheet__title">Show progress for</h2>
      <div className="swap__list">
        {exercises.length === 0 && <p className="swap__option-last">Nothing has been logged yet.</p>}
        {exercises.map((exercise) => (
          <button
            key={exercise.id}
            className={`swap__option ${exercise.id === currentId ? 'swap__option--selected' : ''}`}
            aria-pressed={exercise.id === currentId}
            onClick={() => {
              onClose();
              if (exercise.id !== currentId) replaceScreen(`/progress/${exercise.id}`);
            }}
          >
            <span className="swap__option-name">{exercise.name}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

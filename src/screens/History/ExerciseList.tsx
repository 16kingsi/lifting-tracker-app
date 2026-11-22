import { useState } from 'react';
import { ChevronRightIcon, TrashIcon } from '../../components/Icons';
import { Loading } from '../../components/Loading';
import { Sheet } from '../../components/Sheet';
import { loadExerciseList } from '../../db/queries';
import { deleteUnusedExercise } from '../../db/routine';
import { useData } from '../../db/useData';
import type { ExerciseSummary } from '../../lib/exerciseList';
import { formatShortDate, plural } from '../../lib/format';
import { navigate } from '../../router';
import type { Exercise } from '../../types';

// Every exercise, A to Z. Logged ones open their progress chart. The rest are listed
// apart, and any that nothing uses can be deleted.
export function ExerciseList() {
  const list = useData(loadExerciseList);
  const [deleting, setDeleting] = useState<Exercise | null>(null);

  if (!list) return <Loading />;

  const byName = (a: ExerciseSummary, b: ExerciseSummary) => a.exercise.name.localeCompare(b.exercise.name);
  const logged = list.filter((e) => e.workouts > 0).sort(byName);
  const unlogged = list.filter((e) => e.workouts === 0).sort(byName);

  return (
    <div className="exercise-list">
      {logged.length === 0 && (
        <p className="history__empty">Exercises appear here once they're in a finished workout.</p>
      )}
      {logged.map(({ exercise, workouts, lastDate, best }) => (
        <button
          key={exercise.id}
          className="exercise-row"
          onClick={() => navigate(`/progress/${exercise.id}`)}
        >
          <span className="exercise-row__text">
            <span className="exercise-row__name">{exercise.name}</span>
            <span className="exercise-row__meta">
              {plural(workouts, 'workout')} · last {formatShortDate(lastDate ?? 0)}
            </span>
            {best && <span className="exercise-row__best mono">{best}</span>}
          </span>
          <ChevronRightIcon size={20} />
        </button>
      ))}

      {unlogged.length > 0 && (
        <>
          <h2 className="history__month exercise-list__heading">Not logged yet</h2>
          {unlogged.map(({ exercise, days, inActiveWorkout, canDelete }) => (
            <div key={exercise.id} className="exercise-row exercise-row--quiet">
              <span className="exercise-row__text">
                <span className="exercise-row__name">{exercise.name}</span>
                <span className="exercise-row__meta">{whereUsed(days, inActiveWorkout)}</span>
              </span>
              {canDelete && (
                <button
                  aria-label={`Delete ${exercise.name}`}
                  className="icon-button"
                  onClick={() => setDeleting(exercise)}
                >
                  <TrashIcon size={20} />
                </button>
              )}
            </div>
          ))}
          <p className="history__empty exercise-list__note">
            To delete one that's in your routine, remove it on the Routine tab first.
          </p>
        </>
      )}

      {deleting && (
        <Sheet label={`Delete ${deleting.name}`} onClose={() => setDeleting(null)}>
          <h2 className="sheet__title">Delete {deleting.name}?</h2>
          <p className="sheet__text">
            It has never been logged, so no history is lost. It just won't be offered any more when
            you add or swap exercises.
          </p>
          <button
            className="btn btn--danger"
            onClick={async () => {
              await deleteUnusedExercise(deleting.id);
              setDeleting(null);
            }}
          >
            Delete exercise
          </button>
          <button className="btn btn--outline" onClick={() => setDeleting(null)}>
            Keep it
          </button>
        </Sheet>
      )}
    </div>
  );
}

function whereUsed(days: string[], inActiveWorkout: boolean): string {
  if (inActiveWorkout) return "In today's workout";
  if (days.length > 0) return `In ${days.map((d) => `Day ${d}`).join(' and ')}`;
  return 'Not in your routine';
}

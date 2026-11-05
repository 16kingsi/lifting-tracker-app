import { useState } from 'react';
import { ChevronDownIcon, PlusIcon } from '../../components/Icons';
import { Sheet } from '../../components/Sheet';
import type { FinishedWorkout } from '../../db/queries';
import {
  deleteFinishedSet,
  discardSession,
  logSet,
  reopenSession,
  updateSet,
} from '../../db/workouts';
import { formatDate, formatSet, plural } from '../../lib/format';
import { draftFromSet, prefill } from '../../lib/prefill';
import { groupSets } from '../../lib/sessionGroups';
import { durationMinutes } from '../../lib/sessionTime';
import { navigate } from '../../router';
import type { Draft, Exercise, ExerciseType, LoggedSet, Unit } from '../../types';
import { KeypadSheet } from '../Workout/KeypadSheet';

// What the keypad is open for: changing a set, or adding one to an exercise.
type SetEdit =
  | { set: LoggedSet; number: number }
  | { exercise: Exercise; existing: LoggedSet[] };

interface SessionCardProps {
  workout: FinishedWorkout;
  exercisesById: Map<string, Exercise>;
  defaultUnit: Unit;
  canReopen: boolean; // false while another workout is in progress
  open: boolean;
  onToggle: () => void;
}

export function SessionCard({
  workout,
  exercisesById,
  defaultUnit,
  canReopen,
  open,
  onToggle,
}: SessionCardProps) {
  const { session, sets } = workout;
  const [setEdit, setSetEdit] = useState<SetEdit | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function keepLogging() {
    if (await reopenSession(session.id)) navigate('/workout');
  }

  return (
    <article className="session">
      <button className="session__summary" aria-expanded={open} onClick={onToggle}>
        <span className="day-chip mono">{session.templateId}</span>
        <span className="session__text">
          <span className="session__date">{formatDate(session.finishedAt ?? 0)}</span>
          <span className="session__meta">
            {plural(sets.length, 'set')} · {durationMinutes(session)} min
          </span>
        </span>
        <span className={`session__chevron ${open ? 'session__chevron--open' : ''}`}>
          <ChevronDownIcon size={20} width={2.2} />
        </span>
      </button>

      {open && (
        <div className="session__body">
          {groupSets(session, sets).map((group) => {
            const exercise = exercisesById.get(group.exerciseId);
            if (!exercise) return null;
            const notes = [...new Set(group.sets.map((s) => s.note).filter(Boolean))];
            return (
              <div key={group.exerciseId} className="session__exercise">
                <h3 className="session__exercise-name">{exercise.name}</h3>
                <div className="session__sets">
                  {group.sets.map((set, i) => (
                    <button
                      key={set.id}
                      className="set-chip mono"
                      aria-label={`Change set ${i + 1} of ${exercise.name}: ${formatSet(set)}`}
                      onClick={() => setSetEdit({ set, number: i + 1 })}
                    >
                      {formatSet(set)}
                    </button>
                  ))}
                  <button
                    className="set-chip set-chip--add"
                    aria-label={`Add a set to ${exercise.name}`}
                    onClick={() => setSetEdit({ exercise, existing: group.sets })}
                  >
                    <PlusIcon size={18} />
                  </button>
                </div>
                {notes.map((note) => (
                  <p key={note} className="session__note">
                    {note}
                  </p>
                ))}
              </div>
            );
          })}

          <p className="session__hint">Tap a set to change or delete it.</p>

          <div className="session__actions">
            <button className="btn btn--outline" disabled={!canReopen} onClick={keepLogging}>
              Keep logging
            </button>
            <button className="btn btn--danger" onClick={() => setConfirmingDelete(true)}>
              Delete workout
            </button>
          </div>
          {!canReopen && (
            <p className="session__hint">Finish the workout in progress before reopening this one.</p>
          )}
        </div>
      )}

      {setEdit && (
        <SetEditor
          edit={setEdit}
          sessionId={session.id}
          defaultUnit={defaultUnit}
          isOnlySet={sets.length === 1}
          onClose={() => setSetEdit(null)}
        />
      )}

      {confirmingDelete && (
        <Sheet label="Delete workout" onClose={() => setConfirmingDelete(false)}>
          <h2 className="sheet__title">Delete this workout?</h2>
          <p className="sheet__text">
            This permanently deletes Day {session.templateId} from{' '}
            {formatDate(session.finishedAt ?? 0)} and its {plural(sets.length, 'set')}.
          </p>
          <button className="btn btn--danger" onClick={() => discardSession(session.id)}>
            Delete workout
          </button>
          <button className="btn btn--outline" onClick={() => setConfirmingDelete(false)}>
            Keep it
          </button>
        </Sheet>
      )}
    </article>
  );
}

interface SetEditorProps {
  edit: SetEdit;
  sessionId: string;
  defaultUnit: Unit;
  isOnlySet: boolean; // deleting it would leave the workout empty
  onClose: () => void;
}

function SetEditor({ edit, sessionId, defaultUnit, isOnlySet, onClose }: SetEditorProps) {
  if ('set' in edit) {
    const { set, number } = edit;
    const type: ExerciseType = set.kind;
    const base = prefill({ exerciseType: type, todaySets: [], lastTimeSets: [], defaultUnit });

    return (
      <KeypadSheet
        type={type}
        setNumber={number}
        startField={type === 'timed' ? 'seconds' : 'reps'}
        draft={draftFromSet(set, base)}
        onDone={async (values: Draft) => {
          await updateSet(set, type, values);
          onClose();
        }}
        saved={{
          onCancel: onClose,
          onDelete: async () => {
            await deleteFinishedSet(set);
            onClose();
          },
          deleteLabel: isOnlySet ? 'Delete set and workout' : 'Delete set',
        }}
      />
    );
  }

  const { exercise, existing } = edit;
  const draft = prefill({
    exerciseType: exercise.type,
    todaySets: existing,
    lastTimeSets: [],
    defaultUnit,
  });

  return (
    <KeypadSheet
      type={exercise.type}
      setNumber={existing.length + 1}
      startField={exercise.type === 'timed' ? 'seconds' : 'reps'}
      draft={draft}
      onDone={async (values: Draft) => {
        await logSet(sessionId, exercise.id, exercise.type, values);
        onClose();
      }}
      saved={{ onCancel: onClose }}
    />
  );
}

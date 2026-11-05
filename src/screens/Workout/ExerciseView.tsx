import { useEffect, useRef, useState } from 'react';
import { SwapIcon } from '../../components/Icons';
import type { ActiveWorkout } from '../../db/queries';
import { deleteSet, logSet, updateSet } from '../../db/workouts';
import { formatDate, summarizeSets } from '../../lib/format';
import type { LastTime } from '../../lib/lastTime';
import { prefill } from '../../lib/prefill';
import { useBackStep } from '../../router';
import type { Draft, Exercise, LoggedSet } from '../../types';
import { EntryPanel } from './EntryPanel';
import { KeypadSheet, type KeypadField } from './KeypadSheet';
import { RestTimer } from './RestTimer';
import { SetRow } from './SetRow';
import { Stopwatch } from './Stopwatch';
import { SwapSheet } from './SwapSheet';

interface ExerciseViewProps {
  workout: ActiveWorkout;
  exercise: Exercise;
  index: number;
  lastTime: LastTime | null;
}

// Everything below the exercise name: last time, today's sets and the entry panel.
export function ExerciseView({ workout, exercise, index, lastTime }: ExerciseViewProps) {
  const { session, sets: allSets, settings } = workout;
  const todaySets = allSets.filter((s) => s.exerciseId === exercise.id);
  const targetSets = session.items[index].targetSets;
  const lastTimeSets = lastTime?.sets ?? [];

  const prefillFrom = (sets: LoggedSet[]) =>
    prefill({
      exerciseType: exercise.type,
      todaySets: sets,
      lastTimeSets,
      defaultUnit: settings.defaultUnit,
    });

  const [draft, setDraft] = useState<Draft>(() => prefillFrom(todaySets));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [keypadField, setKeypadField] = useState<KeypadField | null>(null);
  const [stopwatchOpen, setStopwatchOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);

  const editingIndex = todaySets.findIndex((s) => s.id === editingId);
  const setNumber = editingIndex >= 0 ? editingIndex + 1 : todaySets.length + 1;
  const isTimed = exercise.type === 'timed';
  const canLog = isTimed ? draft.seconds > 0 : draft.reps > 0;
  const lastLoggedAt = allSets.length > 0 ? Math.max(...allSets.map((s) => s.loggedAt)) : null;

  // Keep the newest set in view as the list grows.
  const listRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [todaySets.length]);

  function resetEntry(sets: LoggedSet[]) {
    setDraft(prefillFrom(sets));
    setSelectedId(null);
    setEditingId(null);
  }

  // The phone's Back button cancels an edit, or closes a set's Edit and Delete buttons.
  useBackStep(editingId !== null, () => resetEntry(todaySets));
  useBackStep(selectedId !== null, () => setSelectedId(null));

  async function save(values: Draft) {
    const editing = todaySets.find((s) => s.id === editingId);
    if (editing) {
      const updated = await updateSet(editing, exercise.type, values);
      resetEntry(todaySets.map((s) => (s.id === updated.id ? updated : s)));
    } else {
      const created = await logSet(session.id, exercise.id, exercise.type, values);
      resetEntry([...todaySets, created]);
    }
  }

  function startEditing(set: LoggedSet) {
    const fromSet =
      set.kind === 'weight'
        ? { reps: set.reps, weight: set.weightValue, unit: set.weightUnit }
        : { seconds: set.durationSec };
    setDraft({ ...draft, ...fromSet, note: set.note });
    setEditingId(set.id);
    setSelectedId(null);
    setStopwatchOpen(false);
  }

  async function removeSet(set: LoggedSet) {
    await deleteSet(set.id);
    resetEntry(todaySets.filter((s) => s.id !== set.id));
  }

  function tapRow(set: LoggedSet) {
    // Tapping the set being edited cancels the edit.
    if (set.id === editingId) resetEntry(todaySets);
    else setSelectedId(selectedId === set.id ? null : set.id);
  }

  const setRows = todaySets.map((set, i) => (
    <SetRow
      key={set.id}
      set={set}
      number={i + 1}
      selected={selectedId === set.id}
      editing={editingId === set.id}
      onTap={() => tapRow(set)}
      onEdit={() => startEditing(set)}
      onDelete={() => removeSet(set)}
    />
  ));

  return (
    <>
      <div className="last-time">
        <div className="last-time__text">
          <span className="eyebrow">
            Last time{lastTime ? ` · ${formatDate(lastTime.finishedAt)}` : ''}
          </span>
          <span className={lastTime ? 'last-time__line mono' : 'last-time__empty'}>
            {lastTime ? summarizeSets(lastTimeSets) : 'No history yet'}
          </span>
        </div>
        <button
          aria-label="Swap or add exercise"
          className="icon-button"
          onClick={() => setSwapOpen(true)}
        >
          <SwapIcon />
        </button>
      </div>

      {stopwatchOpen ? (
        <Stopwatch
          holdNumber={todaySets.length + 1}
          goalSeconds={Math.max(0, ...lastTimeSets.map((s) => (s.kind === 'timed' ? s.durationSec : 0)))}
          setRows={setRows}
          onLog={(seconds) => save({ ...draft, seconds })}
          onManual={() => setStopwatchOpen(false)}
        />
      ) : (
        <>
          <section aria-label="Sets today" className="sets" ref={listRef}>
            {setRows}
            {editingId === null && (
              <div className="next-set">
                <span className="next-set__number mono">{todaySets.length + 1}</span>
                <span className="next-set__label">
                  {nextSetLabel(todaySets.length, targetSets, lastTime !== null)}
                </span>
              </div>
            )}
            {lastLoggedAt !== null && <RestTimer since={lastLoggedAt} />}
          </section>

          <EntryPanel
            type={exercise.type}
            draft={draft}
            logLabel={
              editingId !== null
                ? `Update set ${setNumber}`
                : `${isTimed ? 'Log hold' : 'Log set'} ${setNumber}`
            }
            canLog={canLog}
            onChange={(change) => setDraft({ ...draft, ...change })}
            onOpenKeypad={setKeypadField}
            onOpenStopwatch={() => setStopwatchOpen(true)}
            onLog={() => save(draft)}
          />
        </>
      )}

      {keypadField && (
        <KeypadSheet
          key={keypadField}
          type={exercise.type}
          setNumber={setNumber}
          startField={keypadField}
          draft={draft}
          onDone={(values) => {
            setDraft(values);
            setKeypadField(null);
          }}
        />
      )}

      {swapOpen && (
        <SwapSheet
          session={session}
          index={index}
          exercise={exercise}
          onClose={() => setSwapOpen(false)}
        />
      )}
    </>
  );
}

function nextSetLabel(loggedCount: number, targetSets: number, hasLastTime: boolean): string {
  if (loggedCount >= targetSets) return 'Extra set (optional)';
  if (loggedCount > 0) return `Up next · same as set ${loggedCount}`;
  return hasLastTime ? 'Up next · pre-filled from last time' : 'Up next';
}

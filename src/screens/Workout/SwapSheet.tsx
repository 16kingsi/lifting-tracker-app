import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CheckIcon, CloseIcon, PlusIcon, SearchIcon } from '../../components/Icons';
import { Sheet } from '../../components/Sheet';
import { getSwapOptions } from '../../db/queries';
import { addExercise, swapExercise, type ExerciseChoice } from '../../db/workouts';
import { formatShortDate, summarizeSets } from '../../lib/format';
import type { Exercise, ExerciseType, Session } from '../../types';

interface SwapSheetProps {
  session: Session;
  index: number;
  exercise: Exercise;
  onClose: () => void;
}

export function SwapSheet({ session, index, exercise, onClose }: SwapSheetProps) {
  const excludeIds = session.items.map((i) => i.exerciseId);
  const options = useLiveQuery(() => getSwapOptions(excludeIds), [excludeIds.join()]) ?? [];

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newType, setNewType] = useState<ExerciseType>('weight');
  const [updateTemplate, setUpdateTemplate] = useState(false);

  const typed = search.trim();
  const lowerTyped = typed.toLowerCase();
  const visible = options.filter((o) => o.exercise.name.toLowerCase().includes(lowerTyped));
  // Includes exercises already in today's workout, so a name can't be created twice.
  const nameIsTaken =
    typed === '' ||
    options.some((o) => o.exercise.name.toLowerCase() === lowerTyped) ||
    exercise.name.toLowerCase() === lowerTyped;

  const selected = visible.find((o) => o.exercise.id === selectedId)?.exercise;
  const creating = !selected && !nameIsTaken;
  const choice: ExerciseChoice | null = selected
    ? { id: selected.id }
    : creating
      ? { name: typed, type: newType }
      : null;
  const choiceName = selected?.name ?? (creating ? typed : null);

  async function apply(action: typeof swapExercise) {
    if (!choice) return;
    await action(session, index, choice, updateTemplate);
    onClose();
  }

  return (
    <Sheet label="Swap or add exercise" onClose={onClose} className="swap">
      <div className="swap__header">
        <div className="swap__heading">
          <h2 className="sheet__title">Swap {exercise.name}</h2>
          <span className="swap__subtitle">Equipment taken? Pick a replacement.</span>
        </div>
        <button aria-label="Close" className="icon-button" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>

      <label className="swap__search">
        <span className="keypad__note-icon">
          <SearchIcon />
        </span>
        <span className="visually-hidden">Search or type a new exercise</span>
        <input
          type="text"
          value={search}
          placeholder="Search or type a new exercise"
          onChange={(event) => {
            setSearch(event.target.value);
            setSelectedId(null);
          }}
        />
      </label>

      <div className="swap__list">
        <span className="eyebrow">Used before</span>
        {visible.map(({ exercise: option, lastTime }) => {
          const isSelected = option.id === selectedId;
          return (
            <button
              key={option.id}
              className={`swap__option ${isSelected ? 'swap__option--selected' : ''}`}
              aria-pressed={isSelected}
              onClick={() => setSelectedId(isSelected ? null : option.id)}
            >
              <span className="swap__option-text">
                <span className="swap__option-name">{option.name}</span>
                {lastTime ? (
                  <span className="swap__option-last mono">
                    Last: {summarizeSets(lastTime.sets)} · {formatShortDate(lastTime.finishedAt)}
                  </span>
                ) : (
                  <span className="swap__option-last">Not logged yet</span>
                )}
              </span>
              {isSelected && (
                <span className="swap__tick" role="img" aria-label="Selected">
                  <CheckIcon />
                </span>
              )}
            </button>
          );
        })}
        {creating && (
          <div className="swap__new">
            <span className="swap__option-name">New exercise: {typed}</span>
            <div role="radiogroup" aria-label="Exercise type" className="segmented">
              <button
                role="radio"
                aria-checked={newType === 'weight'}
                className="segmented__option"
                onClick={() => setNewType('weight')}
              >
                Weight × reps
              </button>
              <button
                role="radio"
                aria-checked={newType === 'timed'}
                className="segmented__option"
                onClick={() => setNewType('timed')}
              >
                Timed
              </button>
            </div>
          </div>
        )}
      </div>

      <fieldset className="swap__apply">
        <legend className="eyebrow">Apply to</legend>
        <div role="radiogroup" className="segmented">
          <button
            role="radio"
            aria-checked={!updateTemplate}
            className="segmented__option"
            onClick={() => setUpdateTemplate(false)}
          >
            Today only
          </button>
          <button
            role="radio"
            aria-checked={updateTemplate}
            className="segmented__option"
            onClick={() => setUpdateTemplate(true)}
          >
            Update Day {session.templateId}
          </button>
        </div>
      </fieldset>

      <div className="swap__actions">
        <button
          className="btn btn--primary swap__confirm"
          disabled={!choice}
          onClick={() => apply(swapExercise)}
        >
          {choiceName ? `Swap in ${choiceName}` : 'Pick an exercise'}
        </button>
        <button className="btn btn--outline" disabled={!choice} onClick={() => apply(addExercise)}>
          <PlusIcon size={18} />
          Add as an extra exercise instead
        </button>
      </div>
    </Sheet>
  );
}

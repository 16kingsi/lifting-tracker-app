import { useState } from 'react';
import { getExerciseOptions } from '../db/queries';
import { useData } from '../db/useData';
import type { ExerciseChoice } from '../db/workouts';
import { formatShortDate, summarizeSets } from '../lib/format';
import type { ExerciseType } from '../types';
import { CheckIcon, SearchIcon } from './Icons';

// The search box and list for choosing an exercise, used when swapping one in a
// workout and when adding one to the routine. Choosing from this list instead of only
// typing a name keeps an exercise's history together under one exercise.
export function useExercisePicker(excludeIds: string[]) {
  const data = useData(() => getExerciseOptions(excludeIds), [excludeIds.join()]);
  const options = data?.options ?? [];
  const takenNames = data?.takenNames ?? [];

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newType, setNewType] = useState<ExerciseType>('weight');

  const typed = search.trim();
  const lowerTyped = typed.toLowerCase();
  const visible = options.filter((o) => o.exercise.name.toLowerCase().includes(lowerTyped));
  const nameIsTaken = takenNames.includes(lowerTyped);

  const selected = visible.find((o) => o.exercise.id === selectedId)?.exercise;
  const creating = !selected && typed !== '' && !nameIsTaken;
  const alreadyAdded = nameIsTaken && !options.some((o) => o.exercise.name.toLowerCase() === lowerTyped);

  const choice: ExerciseChoice | null = selected
    ? { id: selected.id }
    : creating
      ? { name: typed, type: newType }
      : null;
  const choiceName = selected?.name ?? (creating ? typed : null);

  const picker = (
    <>
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
        {alreadyAdded && <p className="swap__option-last">{typed} is already added.</p>}
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
    </>
  );

  return { choice, choiceName, picker };
}

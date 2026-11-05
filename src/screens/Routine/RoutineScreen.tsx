import { useState } from 'react';
import { useExercisePicker } from '../../components/ExercisePicker';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CloseIcon,
  EditIcon,
  MinusIcon,
  PlusIcon,
} from '../../components/Icons';
import { Loading } from '../../components/Loading';
import { Sheet } from '../../components/Sheet';
import { loadRoutine } from '../../db/queries';
import { addToTemplate, renameExercise, saveTemplateItems, setExerciseType } from '../../db/routine';
import { useData } from '../../db/useData';
import { plural } from '../../lib/format';
import { moveItem, nameProblem } from '../../lib/routine';
import type { Exercise, PlanItem, TemplateId } from '../../types';
import '../Workout/workout.css';
import './routine.css';

const DAYS: TemplateId[] = ['A', 'B'];
const MAX_TARGET_SETS = 20;

export function RoutineScreen() {
  const routine = useData(loadRoutine);
  const [day, setDay] = useState<TemplateId>('A');
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  if (!routine) return <Loading />;

  const items = routine.templates.find((t) => t.id === day)?.items ?? [];
  const save = (next: PlanItem[]) => saveTemplateItems(day, next);

  return (
    <>
      <header className="routine__header">
        <h1 className="routine__title">Routine</h1>
        <div role="tablist" aria-label="Workout day" className="routine__days">
          {DAYS.map((d) => (
            <button
              key={d}
              role="tab"
              aria-selected={day === d}
              className="routine__day"
              onClick={() => {
                setDay(d);
                setOpenId(null);
              }}
            >
              Day {d}
            </button>
          ))}
        </div>
      </header>

      <div className="routine">
        {items.map((item, index) => {
          const exercise = routine.exercises.find((e) => e.id === item.exerciseId);
          if (!exercise) return null;
          return (
            <RoutineRow
              key={item.exerciseId}
              day={day}
              item={item}
              exercise={exercise}
              otherNames={routine.exercises
                .filter((e) => e.id !== exercise.id)
                .map((e) => e.name.toLowerCase())}
              isFirst={index === 0}
              isLast={index === items.length - 1}
              open={openId === item.exerciseId}
              onToggle={() => setOpenId(openId === item.exerciseId ? null : item.exerciseId)}
              onMove={(by) => save(moveItem(items, index, index + by))}
              onChangeSets={(targetSets) =>
                save(items.map((i) => (i === item ? { ...i, targetSets } : i)))
              }
              onRemove={() => save(items.filter((i) => i !== item))}
            />
          );
        })}

        <button className="routine__add" onClick={() => setAdding(true)}>
          <PlusIcon size={18} />
          Add exercise to Day {day}
        </button>
        <p className="routine__footnote">
          Changes apply to future workouts. Past sessions keep the exercises they were logged with.
        </p>
      </div>

      {adding && (
        <AddExerciseSheet
          day={day}
          excludeIds={items.map((i) => i.exerciseId)}
          onAdded={setOpenId}
          onClose={() => setAdding(false)}
        />
      )}
    </>
  );
}

interface RoutineRowProps {
  day: TemplateId;
  item: PlanItem;
  exercise: Exercise;
  otherNames: string[];
  isFirst: boolean;
  isLast: boolean;
  open: boolean;
  onToggle: () => void;
  onMove: (by: number) => void;
  onChangeSets: (targetSets: number) => void;
  onRemove: () => void;
}

function RoutineRow(props: RoutineRowProps) {
  const { day, item, exercise, otherNames, isFirst, isLast, open } = props;
  const { onToggle, onMove, onChangeSets, onRemove } = props;
  const isTimed = exercise.type === 'timed';

  return (
    <div className={`routine-row ${open ? 'routine-row--open' : ''}`}>
      <div className="routine-row__top">
        <div className="routine-row__arrows">
          <button
            aria-label={`Move ${exercise.name} up`}
            disabled={isFirst}
            className="routine-row__arrow"
            onClick={() => onMove(-1)}
          >
            <ChevronUpIcon />
          </button>
          <button
            aria-label={`Move ${exercise.name} down`}
            disabled={isLast}
            className="routine-row__arrow"
            onClick={() => onMove(1)}
          >
            <ChevronDownIcon />
          </button>
        </div>
        <button className="routine-row__main" aria-expanded={open} onClick={onToggle}>
          <span className="routine-row__text">
            <span className="routine-row__name">{exercise.name}</span>
            <span className="routine-row__meta">
              {isTimed ? 'Timed' : 'Weight × reps'} · {plural(item.targetSets, 'set')}
            </span>
          </span>
          <span className="routine-row__edit">
            <EditIcon size={20} />
          </span>
        </button>
      </div>

      {open && (
        <div className="routine-row__body">
          <NameField exercise={exercise} otherNames={otherNames} />

          <div className="routine-row__field">
            <span className="routine-row__label">Type</span>
            <div role="radiogroup" aria-label="Exercise type" className="segmented">
              <button
                role="radio"
                aria-checked={!isTimed}
                className="segmented__option"
                onClick={() => setExerciseType(exercise.id, 'weight')}
              >
                Weight × reps
              </button>
              <button
                role="radio"
                aria-checked={isTimed}
                className="segmented__option"
                onClick={() => setExerciseType(exercise.id, 'timed')}
              >
                Timed
              </button>
            </div>
          </div>

          <div className="routine-row__sets">
            <span className="routine-row__label">Target sets</span>
            <div className="routine-row__stepper">
              <button
                aria-label="Fewer sets"
                className="routine-row__step"
                disabled={item.targetSets <= 1}
                onClick={() => onChangeSets(item.targetSets - 1)}
              >
                <MinusIcon size={22} />
              </button>
              <span className="routine-row__count mono">{item.targetSets}</span>
              <button
                aria-label="More sets"
                className="routine-row__step"
                disabled={item.targetSets >= MAX_TARGET_SETS}
                onClick={() => onChangeSets(item.targetSets + 1)}
              >
                <PlusIcon size={22} />
              </button>
            </div>
          </div>

          <button className="btn btn--danger" onClick={onRemove}>
            Remove from Day {day}
          </button>
        </div>
      )}
    </div>
  );
}

// Saves as you type, as long as the name is usable.
function NameField({ exercise, otherNames }: { exercise: Exercise; otherNames: string[] }) {
  const [name, setName] = useState(exercise.name);
  const problem = nameProblem(name, otherNames);

  return (
    <label className="routine-row__field">
      <span className="routine-row__label">Name</span>
      <input
        type="text"
        className="routine-row__input"
        value={name}
        onChange={(event) => {
          const next = event.target.value;
          setName(next);
          if (!nameProblem(next, otherNames)) renameExercise(exercise.id, next.trim());
        }}
        // Leaving the field with an unusable name puts back the saved one.
        onBlur={() => {
          if (problem) setName(exercise.name);
        }}
      />
      {problem && <span className="routine-row__problem">{problem}</span>}
    </label>
  );
}

interface AddExerciseSheetProps {
  day: TemplateId;
  excludeIds: string[];
  onAdded: (exerciseId: string) => void;
  onClose: () => void;
}

function AddExerciseSheet({ day, excludeIds, onAdded, onClose }: AddExerciseSheetProps) {
  const { choice, choiceName, picker } = useExercisePicker(excludeIds);

  async function add() {
    if (!choice) return;
    onAdded(await addToTemplate(day, choice));
    onClose();
  }

  return (
    <Sheet label={`Add exercise to Day ${day}`} onClose={onClose} className="swap">
      <div className="swap__header">
        <h2 className="sheet__title">Add to Day {day}</h2>
        <button aria-label="Close" className="icon-button" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>

      {picker}

      <div className="swap__actions">
        <button className="btn btn--primary swap__confirm" disabled={!choice} onClick={add}>
          {choiceName ? `Add ${choiceName}` : 'Pick an exercise'}
        </button>
      </div>
    </Sheet>
  );
}

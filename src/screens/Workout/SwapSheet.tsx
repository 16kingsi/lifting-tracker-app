import { useState } from 'react';
import { useExercisePicker } from '../../components/ExercisePicker';
import { CloseIcon, PlusIcon } from '../../components/Icons';
import { Sheet } from '../../components/Sheet';
import { addExercise, swapExercise } from '../../db/workouts';
import type { Exercise, Session } from '../../types';

interface SwapSheetProps {
  session: Session;
  index: number;
  exercise: Exercise;
  onClose: () => void;
}

export function SwapSheet({ session, index, exercise, onClose }: SwapSheetProps) {
  const { choice, choiceName, picker } = useExercisePicker(session.items.map((i) => i.exerciseId));
  const [updateTemplate, setUpdateTemplate] = useState(false);

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

      {picker}

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

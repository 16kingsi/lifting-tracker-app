import { CheckIcon, MinusIcon, NoteIcon, PlusIcon, TimerIcon } from '../../components/Icons';
import { UnitToggle } from '../../components/UnitToggle';
import { formatDuration } from '../../lib/format';
import { convertForEntry, formatLb, stepFor, stepWeight, toLb } from '../../lib/units';
import type { Draft, ExerciseType, Unit } from '../../types';
import type { KeypadField } from './KeypadSheet';

interface EntryPanelProps {
  type: ExerciseType;
  draft: Draft;
  logLabel: string;
  canLog: boolean;
  onChange: (change: Partial<Draft>) => void;
  onOpenKeypad: (field: KeypadField) => void;
  onOpenStopwatch: () => void;
  onLog: () => void;
}

// The panel at the bottom of the workout screen: steppers and the Log button.
export function EntryPanel({
  type,
  draft,
  logLabel,
  canLog,
  onChange,
  onOpenKeypad,
  onOpenStopwatch,
  onLog,
}: EntryPanelProps) {
  function changeUnit(unit: Unit) {
    onChange({ unit, weight: convertForEntry(draft.weight, draft.unit, unit) });
  }

  return (
    <section aria-label="Enter set" className="entry">
      {type === 'weight' ? (
        <>
          <div className="entry__row">
            <span className="entry__label">Reps</span>
            <button
              aria-label="Fewer reps"
              className="stepper"
              onClick={() => onChange({ reps: Math.max(0, draft.reps - 1) })}
            >
              <MinusIcon />
            </button>
            <button
              aria-label="Type reps"
              className="entry__value entry__value--large mono"
              onClick={() => onOpenKeypad('reps')}
            >
              {draft.reps}
            </button>
            <button
              aria-label="More reps"
              className="stepper"
              onClick={() => onChange({ reps: draft.reps + 1 })}
            >
              <PlusIcon />
            </button>
          </div>

          <div className="entry__row">
            <span className="entry__label entry__label--stacked">
              Weight
              <UnitToggle unit={draft.unit} onChange={changeUnit} size="small" />
            </span>
            <button
              aria-label="Less weight"
              className="stepper"
              onClick={() => onChange({ weight: stepWeight(draft.weight, draft.unit, -1) })}
            >
              <MinusIcon />
            </button>
            <button
              aria-label="Type weight"
              className="entry__value mono"
              onClick={() => onOpenKeypad('weight')}
            >
              <span className="entry__weight">
                {draft.weight}
                <span className="entry__weight-unit"> {draft.unit}</span>
              </span>
              <span className="entry__hint">
                {draft.unit === 'kg'
                  ? `≈ ${formatLb(toLb(draft.weight, 'kg'))} lb`
                  : `step ${stepFor('lb')} lb`}
              </span>
            </button>
            <button
              aria-label="More weight"
              className="stepper"
              onClick={() => onChange({ weight: stepWeight(draft.weight, draft.unit, 1) })}
            >
              <PlusIcon />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="entry__row">
            <span className="entry__label">Hold</span>
            <button
              aria-label="5 seconds less"
              className="stepper stepper--text"
              onClick={() => onChange({ seconds: Math.max(0, draft.seconds - 5) })}
            >
              −5s
            </button>
            <button
              aria-label="Type duration in seconds"
              className="entry__value entry__value--large mono"
              onClick={() => onOpenKeypad('seconds')}
            >
              {formatDuration(draft.seconds)}
            </button>
            <button
              aria-label="5 seconds more"
              className="stepper stepper--text"
              onClick={() => onChange({ seconds: draft.seconds + 5 })}
            >
              +5s
            </button>
          </div>
          <button className="btn btn--outline" onClick={onOpenStopwatch}>
            <TimerIcon />
            Use stopwatch instead
          </button>
        </>
      )}

      <div className="entry__actions">
        <button
          aria-label={draft.note ? 'Edit note on this set' : 'Add note to this set'}
          className="entry__note"
          onClick={() => onOpenKeypad('note')}
        >
          <NoteIcon />
          {draft.note && <span className="entry__note-dot" />}
        </button>
        <button className="btn btn--primary" disabled={!canLog} onClick={onLog}>
          <CheckIcon width={2.8} />
          {logLabel}
        </button>
      </div>
    </section>
  );
}

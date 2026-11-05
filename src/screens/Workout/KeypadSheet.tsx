import { useState } from 'react';
import { BackspaceIcon, NoteIcon } from '../../components/Icons';
import { Sheet } from '../../components/Sheet';
import { UnitToggle } from '../../components/UnitToggle';
import { formatDuration } from '../../lib/format';
import { applyPadKey, parsePadText, type PadKey } from '../../lib/keypad';
import { convertForEntry, formatLb, toLb } from '../../lib/units';
import type { Draft, ExerciseType, Unit } from '../../types';

export type KeypadField = 'reps' | 'weight' | 'seconds' | 'note';
type NumberField = Exclude<KeypadField, 'note'>;

const FIELD_NAMES: Record<NumberField, string> = {
  reps: 'Reps',
  weight: 'Weight',
  seconds: 'Duration',
};

const KEYS: PadKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'];

interface KeypadSheetProps {
  type: ExerciseType;
  setNumber: number;
  startField: KeypadField;
  draft: Draft;
  onDone: (values: Draft) => void;
  // For changing saved sets, where Done saves straight away: Back and the dimmed area
  // cancel instead, and a set with nothing in it can't be saved.
  saved?: {
    onCancel: () => void;
    onDelete?: () => void;
    deleteLabel?: string;
  };
}

export function KeypadSheet({ type, setNumber, startField, draft, onDone, saved }: KeypadSheetProps) {
  const isTimed = type === 'timed';
  const [field, setField] = useState<NumberField>(
    startField === 'note' ? (isTimed ? 'seconds' : 'reps') : startField,
  );
  const [texts, setTexts] = useState<Record<NumberField, string>>({
    reps: String(draft.reps),
    weight: String(draft.weight),
    seconds: String(draft.seconds),
  });
  const [unit, setUnit] = useState<Unit>(draft.unit);
  const [note, setNote] = useState(draft.note);
  const [fresh, setFresh] = useState(true); // nothing typed yet in the current field
  const [weightTyped, setWeightTyped] = useState(false);
  const [noteFocused, setNoteFocused] = useState(startField === 'note');

  const weight = parsePadText(texts.weight);

  function pressKey(key: PadKey) {
    const text = applyPadKey(texts[field], key, { allowDecimal: field === 'weight', fresh });
    setTexts({ ...texts, [field]: text });
    setFresh(false);
    if (field === 'weight') setWeightTyped(true);
  }

  function switchField(next: NumberField) {
    setField(next);
    setFresh(true);
  }

  function changeUnit(next: Unit) {
    // A number just typed in is what's on the equipment, so only its label changes.
    // A pre-filled number gets converted, the same as on the main screen.
    if (!weightTyped) {
      setTexts({ ...texts, weight: String(convertForEntry(weight, unit, next)) });
    }
    setUnit(next);
  }

  function done() {
    onDone({
      reps: parsePadText(texts.reps),
      weight,
      unit,
      seconds: parsePadText(texts.seconds),
      note,
    });
  }

  const isEmpty = parsePadText(isTimed ? texts.seconds : texts.reps) <= 0;

  return (
    <Sheet
      label={`Enter ${FIELD_NAMES[field]} for set ${setNumber}`}
      onClose={saved ? saved.onCancel : done}
    >
      <div className="keypad__top">
        <h2 className="keypad__title">
          {isTimed ? 'Hold' : 'Set'} {setNumber} · {FIELD_NAMES[field]}
        </h2>
        {!isTimed && <UnitToggle unit={unit} onChange={changeUnit} size="large" />}
      </div>

      {isTimed ? (
        <div className="keypad__tile keypad__tile--active">
          <span className="keypad__tile-label">Seconds</span>
          <span className="keypad__tile-value mono">
            {texts.seconds || '0'}
            <span className="keypad__tile-unit"> = {formatDuration(parsePadText(texts.seconds))}</span>
          </span>
        </div>
      ) : (
        <>
          <div className="keypad__tiles">
            <button
              className={`keypad__tile ${field === 'reps' ? 'keypad__tile--active' : ''}`}
              onClick={() => switchField('reps')}
            >
              <span className="keypad__tile-label">Reps</span>
              <span className="keypad__tile-value mono">{texts.reps || '0'}</span>
            </button>
            <button
              className={`keypad__tile ${field === 'weight' ? 'keypad__tile--active' : ''}`}
              onClick={() => switchField('weight')}
            >
              <span className="keypad__tile-label">Weight</span>
              <span className="keypad__tile-value mono">
                {texts.weight || '0'}
                <span className="keypad__tile-unit"> {unit}</span>
              </span>
            </button>
          </div>
          <p className="keypad__conversion mono">
            {unit === 'kg' ? `≈ ${formatLb(toLb(weight, 'kg'))} lb in charts` : ' '}
          </p>
        </>
      )}

      <label className="keypad__note">
        <span className="keypad__note-icon">
          <NoteIcon size={20} />
        </span>
        <span className="visually-hidden">Note</span>
        <input
          type="text"
          autoFocus={startField === 'note'}
          value={note}
          placeholder="Note (optional) — e.g. machine 4, seat 3"
          onChange={(event) => setNote(event.target.value)}
          onFocus={() => setNoteFocused(true)}
          onBlur={() => setNoteFocused(false)}
        />
      </label>

      {/* Android's own keyboard appears for the note, so the number pad steps aside. */}
      {!noteFocused && (
        <div role="group" aria-label="Number pad" className="keypad__pad">
          {KEYS.map((key) => (
            <PadButton
              key={key}
              padKey={key}
              disabled={key === '.' && field !== 'weight'}
              onPress={() => pressKey(key)}
            />
          ))}
        </div>
      )}

      <div className="keypad__actions">
        {!isTimed && (
          <button
            className="btn btn--raised keypad__next"
            onClick={() => switchField(field === 'reps' ? 'weight' : 'reps')}
          >
            Next field
          </button>
        )}
        <button className="btn btn--primary" disabled={saved && isEmpty} onClick={done}>
          {saved ? 'Save' : 'Done'}
        </button>
      </div>

      {saved?.onDelete && (
        <button className="btn btn--danger" onClick={saved.onDelete}>
          {saved.deleteLabel}
        </button>
      )}
    </Sheet>
  );
}

interface PadButtonProps {
  padKey: PadKey;
  disabled: boolean;
  onPress: () => void;
}

function PadButton({ padKey, disabled, onPress }: PadButtonProps) {
  const quiet = padKey === '.' || padKey === 'back';
  const className = `keypad__key mono ${quiet ? 'keypad__key--quiet' : ''}`;

  if (padKey === 'back') {
    return (
      <button aria-label="Delete digit" className={className} onClick={onPress}>
        <BackspaceIcon />
      </button>
    );
  }
  return (
    <button
      aria-label={padKey === '.' ? 'Decimal point' : undefined}
      className={className}
      disabled={disabled}
      onClick={onPress}
    >
      {padKey}
    </button>
  );
}

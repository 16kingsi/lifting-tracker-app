import { useState } from 'react';
import { Sheet } from '../../components/Sheet';
import { changeWorkoutTimes } from '../../db/workouts';
import { fromInputs, toDateInput, toTimeInput } from '../../lib/dateInput';
import type { Session } from '../../types';

// Changes when a finished workout happened, for one logged after the fact.
export function TimesSheet({ session, onClose }: { session: Session; onClose: () => void }) {
  const finishedAt = session.finishedAt ?? session.startedAt;
  const [date, setDate] = useState(toDateInput(session.startedAt));
  const [start, setStart] = useState(toTimeInput(session.startedAt));
  const [end, setEnd] = useState(toTimeInput(finishedAt));

  const result = fromInputs(date, start, end, Date.now());

  async function save() {
    if ('error' in result) return;
    await changeWorkoutTimes(session, result.startedAt, result.finishedAt);
    onClose();
  }

  return (
    <Sheet label="Date and time" onClose={onClose}>
      <h2 className="sheet__title">Date and time</h2>

      <label className="times__field">
        <span className="times__label">Date</span>
        <input
          type="date"
          className="times__input"
          value={date}
          max={toDateInput(Date.now())}
          onChange={(event) => setDate(event.target.value)}
        />
      </label>
      <div className="times__row">
        <label className="times__field">
          <span className="times__label">Start</span>
          <input
            type="time"
            className="times__input"
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
        </label>
        <label className="times__field">
          <span className="times__label">End</span>
          <input
            type="time"
            className="times__input"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
          />
        </label>
      </div>

      <p className={'error' in result ? 'times__error' : 'times__note'} role="status">
        {'error' in result
          ? result.error
          : result.endsNextDay
            ? 'Ends the next day, after midnight.'
            : ' '}
      </p>

      <button className="btn btn--primary" disabled={'error' in result} onClick={save}>
        Save
      </button>
      <button className="btn btn--outline" onClick={onClose}>
        Cancel
      </button>
    </Sheet>
  );
}

import { CheckIcon, EditIcon, TrashIcon } from '../../components/Icons';
import { formatDuration } from '../../lib/format';
import { formatLb, toLb } from '../../lib/units';
import type { LoggedSet } from '../../types';

interface SetRowProps {
  set: LoggedSet;
  number: number;
  selected: boolean;
  editing: boolean;
  onTap: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

// One logged set. Tapping it shows Edit and Delete.
export function SetRow({ set, number, selected, editing, onTap, onEdit, onDelete }: SetRowProps) {
  return (
    <div className={`set-row ${selected || editing ? 'set-row--active' : ''}`}>
      <button className="set-row__main" aria-expanded={selected} onClick={onTap}>
        <span className="set-row__number mono">{number}</span>
        <span className="set-row__values">
          <span className="set-row__line mono">
            {set.kind === 'timed' ? (
              formatDuration(set.durationSec)
            ) : (
              <>
                {set.reps} × {set.weightValue} <span className="set-row__unit">{set.weightUnit}</span>
                {set.weightUnit === 'kg' && (
                  <span className="set-row__conversion">
                    {' '}
                    ≈ {formatLb(toLb(set.weightValue, 'kg'))} lb
                  </span>
                )}
              </>
            )}
          </span>
          {set.note && <span className="set-row__note">{set.note}</span>}
        </span>
        <span className="set-row__check" role="img" aria-label="Logged">
          <CheckIcon />
        </span>
      </button>

      {selected && (
        <div className="set-row__actions">
          <button className="set-row__action" onClick={onEdit}>
            <EditIcon />
            Edit
          </button>
          <button className="set-row__action set-row__action--danger" onClick={onDelete}>
            <TrashIcon />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

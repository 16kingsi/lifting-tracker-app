import type { Unit } from '../types';

interface UnitToggleProps {
  unit: Unit;
  onChange: (unit: Unit) => void;
  size: 'small' | 'large'; // small sits in the entry panel, large in the keypad
}

export function UnitToggle({ unit, onChange, size }: UnitToggleProps) {
  return (
    <span role="group" aria-label="Unit" className={`unit-toggle unit-toggle--${size}`}>
      {(['lb', 'kg'] as const).map((option) => (
        <button
          key={option}
          aria-pressed={unit === option}
          className="unit-toggle__option"
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </span>
  );
}

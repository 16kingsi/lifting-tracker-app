import type { Unit } from '../types';

interface UnitToggleProps {
  unit: Unit;
  onChange: (unit: Unit) => void;
  size: 'small' | 'large'; // small sits in the entry panel, large in the keypad
}

// One button: tapping anywhere on it switches to the other unit.
export function UnitToggle({ unit, onChange, size }: UnitToggleProps) {
  const other = unit === 'lb' ? 'kg' : 'lb';

  return (
    <button
      aria-label={`Unit: ${unit}. Switch to ${other}`}
      className={`unit-toggle unit-toggle--${size}`}
      onClick={() => onChange(other)}
    >
      {(['lb', 'kg'] as const).map((option) => (
        <span
          key={option}
          className={`unit-toggle__option ${option === unit ? 'unit-toggle__option--active' : ''}`}
        >
          {option}
        </span>
      ))}
    </button>
  );
}

import type { ReactNode } from 'react';
import { useBackStep } from '../router';

interface SheetProps {
  label: string; // read out by screen readers
  onClose: () => void; // called when the phone's Back button or the dimmed area is used
  className?: string;
  children: ReactNode;
}

// A panel that slides over the current screen, used for the keypad, swap and
// confirmation steps.
export function Sheet({ label, onClose, className = '', children }: SheetProps) {
  useBackStep(true, onClose);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`sheet ${className}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet__handle" aria-hidden="true" />
        {children}
      </section>
    </div>
  );
}

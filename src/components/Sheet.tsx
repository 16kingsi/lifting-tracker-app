import type { ReactNode } from 'react';

interface SheetProps {
  label: string; // read out by screen readers
  onClose: () => void; // called when the dimmed area behind the sheet is tapped
  className?: string;
  children: ReactNode;
}

// A panel that slides over the current screen, used for the keypad, swap and
// confirmation steps.
export function Sheet({ label, onClose, className = '', children }: SheetProps) {
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

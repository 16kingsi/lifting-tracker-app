// The icons from the design mockup, as small components.
import type { ReactNode } from 'react';

function Stroke({ size, width = 2, children }: { size: number; width?: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function Solid({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {children}
    </svg>
  );
}

type IconProps = { size?: number };

export const CloseIcon = ({ size = 22 }: IconProps) => (
  <Stroke size={size}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </Stroke>
);

export const ChevronLeftIcon = ({ size = 24 }: IconProps) => (
  <Stroke size={size} width={2.2}>
    <path d="m15 18-6-6 6-6" />
  </Stroke>
);

export const ChevronRightIcon = ({ size = 24 }: IconProps) => (
  <Stroke size={size} width={2.2}>
    <path d="m9 18 6-6-6-6" />
  </Stroke>
);

export const SwapIcon = ({ size = 22 }: IconProps) => (
  <Stroke size={size}>
    <path d="M7 4 3 8l4 4" />
    <path d="M3 8h14" />
    <path d="m17 20 4-4-4-4" />
    <path d="M21 16H7" />
  </Stroke>
);

export const MinusIcon = ({ size = 26 }: IconProps) => (
  <Stroke size={size} width={2.4}>
    <path d="M5 12h14" />
  </Stroke>
);

export const PlusIcon = ({ size = 26 }: IconProps) => (
  <Stroke size={size} width={2.4}>
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </Stroke>
);

export const CheckIcon = ({ size = 22, width = 2.4 }: IconProps & { width?: number }) => (
  <Stroke size={size} width={width}>
    <path d="M20 6 9 17l-5-5" />
  </Stroke>
);

export const EditIcon = ({ size = 18 }: IconProps) => (
  <Stroke size={size}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </Stroke>
);

export const TrashIcon = ({ size = 18 }: IconProps) => (
  <Stroke size={size}>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6l-1 14H6L5 6" />
  </Stroke>
);

export const NoteIcon = ({ size = 22 }: IconProps) => (
  <Stroke size={size}>
    <path d="M4 4h16v12H8l-4 4z" />
    <path d="M8 9h8" />
    <path d="M8 12h5" />
  </Stroke>
);

export const TimerIcon = ({ size = 18 }: IconProps) => (
  <Stroke size={size}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4" />
    <path d="M10 2h4" />
  </Stroke>
);

export const ChevronUpIcon = ({ size = 18, width = 2.4 }: IconProps & { width?: number }) => (
  <Stroke size={size} width={width}>
    <path d="m6 15 6-6 6 6" />
  </Stroke>
);

export const ChevronDownIcon = ({ size = 18, width = 2.4 }: IconProps & { width?: number }) => (
  <Stroke size={size} width={width}>
    <path d="m6 9 6 6 6-6" />
  </Stroke>
);

export const ShareIcon = ({ size = 20 }: IconProps) => (
  <Stroke size={size}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="m8.6 13.5 6.8 4" />
    <path d="m15.4 6.5-6.8 4" />
  </Stroke>
);

export const DownloadIcon = ({ size = 22 }: IconProps) => (
  <Stroke size={size}>
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 21h14" />
  </Stroke>
);

export const UploadIcon = ({ size = 22 }: IconProps) => (
  <Stroke size={size}>
    <path d="M12 15V3" />
    <path d="m7 8 5-5 5 5" />
    <path d="M5 21h14" />
  </Stroke>
);

export const TableIcon = ({ size = 22 }: IconProps) => (
  <Stroke size={size}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 10h18" />
    <path d="M9 4v16" />
  </Stroke>
);

export const WarningIcon = ({ size = 20 }: IconProps) => (
  <Stroke size={size}>
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
  </Stroke>
);

export const ChartIcon =({ size = 22 }: IconProps) => (
  <Stroke size={size}>
    <path d="M3 3v18h18" />
    <path d="m7 15 4-4 3 3 5-6" />
  </Stroke>
);

export const HomeIcon =({ size = 24 }: IconProps) => (
  <Stroke size={size}>
    <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
  </Stroke>
);

export const ClockIcon = ({ size = 24 }: IconProps) => (
  <Stroke size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Stroke>
);

export const ListIcon = ({ size = 24 }: IconProps) => (
  <Stroke size={size}>
    <path d="M9 6h11" />
    <path d="M9 12h11" />
    <path d="M9 18h11" />
    <path d="M4 6h.01" />
    <path d="M4 12h.01" />
    <path d="M4 18h.01" />
  </Stroke>
);

export const SlidersIcon = ({ size = 24 }: IconProps) => (
  <Stroke size={size}>
    <path d="M4 21v-7" />
    <path d="M4 10V3" />
    <path d="M12 21v-9" />
    <path d="M12 8V3" />
    <path d="M20 21v-5" />
    <path d="M20 12V3" />
    <path d="M2 14h4" />
    <path d="M10 8h4" />
    <path d="M18 16h4" />
  </Stroke>
);

export const PhoneIcon = ({ size = 22 }: IconProps) => (
  <Stroke size={size}>
    <rect x="6" y="2" width="12" height="20" rx="2" />
    <path d="M11 18h2" />
  </Stroke>
);

export const SearchIcon = ({ size = 20 }: IconProps) => (
  <Stroke size={size}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Stroke>
);

export const BackspaceIcon = ({ size = 26 }: IconProps) => (
  <Stroke size={size}>
    <path d="M21 5H9l-6 7 6 7h12z" />
    <path d="m17 9-6 6" />
    <path d="m11 9 6 6" />
  </Stroke>
);

export const ResetIcon = ({ size = 20 }: IconProps) => (
  <Stroke size={size}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </Stroke>
);

export const PlayIcon = ({ size = 22 }: IconProps) => (
  <Solid size={size}>
    <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z" />
  </Solid>
);

export const PauseIcon = ({ size = 20 }: IconProps) => (
  <Solid size={size}>
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </Solid>
);

export const StopIcon = ({ size = 22 }: IconProps) => (
  <Solid size={size}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </Solid>
);

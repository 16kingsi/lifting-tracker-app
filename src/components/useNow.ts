import { useEffect, useState } from 'react';

// The current time, refreshed every `intervalMs` so a clock on screen keeps moving.
// Timers are worked out from timestamps rather than by counting ticks, so they stay
// right even if the phone pauses the app for a while.
export function useNow(intervalMs: number, active = true): number {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, active]);

  return now;
}

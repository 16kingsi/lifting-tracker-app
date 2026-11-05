import { useEffect, useState, type ReactNode } from 'react';
import { PauseIcon, PlayIcon, ResetIcon, StopIcon } from '../../components/Icons';
import { useNow } from '../../components/useNow';
import { formatDuration } from '../../lib/format';
import { useBackStep } from '../../router';

interface StopwatchProps {
  holdNumber: number;
  goalSeconds: number; // the longest hold last time, or 0 if there isn't one
  setRows: ReactNode;
  onLog: (seconds: number) => void;
  onManual: () => void;
}

export function Stopwatch({ holdNumber, goalSeconds, setRows, onLog, onManual }: StopwatchProps) {
  const [runningSince, setRunningSince] = useState<number | null>(null);
  const [savedMs, setSavedMs] = useState(0); // time from before the last pause

  const running = runningSince !== null;
  const now = useNow(200, running);
  const elapsedMs = savedMs + (running ? Math.max(0, now - runningSince) : 0);
  const seconds = Math.floor(elapsedMs / 1000);

  useKeepScreenOn(running);
  useBackStep(true, onManual);

  function reset() {
    setRunningSince(null);
    setSavedMs(0);
  }

  function toggle() {
    if (running) {
      setSavedMs(savedMs + (Date.now() - runningSince));
      setRunningSince(null);
    } else {
      setRunningSince(Date.now());
    }
  }

  function stopAndLog() {
    onLog(seconds);
    reset();
  }

  const status = running ? 'running' : elapsedMs > 0 ? 'paused' : 'ready';

  return (
    <>
      <div className="stopwatch-area">
        {setRows}
        <section aria-label="Stopwatch" className="stopwatch">
          <span className="stopwatch__status">
            Hold {holdNumber} · {status}
          </span>
          <span className="stopwatch__time mono" role="timer">
            {formatDuration(seconds)}
          </span>
          {goalSeconds > 0 && (
            <div className="stopwatch__goal">
              <div className="stopwatch__track">
                <div
                  className="stopwatch__fill"
                  style={{ width: `${Math.min(100, (seconds / goalSeconds) * 100)}%` }}
                />
              </div>
              <div className="stopwatch__goal-text">
                <span>Goal: beat last time</span>
                <span className="mono">{formatDuration(goalSeconds)}</span>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="entry">
        <div className="stopwatch__controls">
          <button className="btn btn--raised" onClick={toggle}>
            {running ? <PauseIcon /> : <PlayIcon size={20} />}
            {running ? 'Pause' : status === 'paused' ? 'Resume' : 'Start'}
          </button>
          <button className="btn btn--raised" onClick={reset}>
            <ResetIcon />
            Reset
          </button>
        </div>
        <button className="btn btn--primary stopwatch__log" disabled={seconds === 0} onClick={stopAndLog}>
          <StopIcon />
          Stop &amp; log hold {holdNumber}
        </button>
        <button className="stopwatch__manual" onClick={onManual}>
          Enter duration manually
        </button>
      </section>
    </>
  );
}

// Stops the phone's screen from turning off in the middle of a hold.
function useKeepScreenOn(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;

    let released = false;
    let lock: WakeLockSentinel | null = null;
    navigator.wakeLock
      .request('screen')
      .then((sentinel) => {
        lock = sentinel;
        if (released) lock.release();
      })
      .catch(() => {
        // The phone refused, for example on low battery. The timer still works.
      });

    return () => {
      released = true;
      lock?.release();
    };
  }, [active]);
}

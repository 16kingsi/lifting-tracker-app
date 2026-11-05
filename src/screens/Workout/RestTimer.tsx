import { TimerIcon } from '../../components/Icons';
import { useNow } from '../../components/useNow';
import { formatDuration } from '../../lib/format';

// Counts up from the last logged set. It has no alarm or countdown in this version.
export function RestTimer({ since }: { since: number }) {
  const now = useNow(1000);
  return (
    <div className="rest-timer">
      <TimerIcon size={16} />
      Rest <span className="mono">{formatDuration((now - since) / 1000)}</span>
    </div>
  );
}

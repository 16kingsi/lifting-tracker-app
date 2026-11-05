import { useEffect, useState } from 'react';

// Shows nothing during a normal load, which takes a moment. If the database still
// hasn't answered after a few seconds, it explains instead of staying blank.
export function Loading() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!slow) return null;
  return (
    <div className="notice">
      <h1 className="notice__title">Still loading</h1>
      <p className="notice__text">
        If this app is also open in a Chrome tab, close that tab. Your logged sets are saved.
      </p>
      <button className="btn btn--primary" onClick={() => window.location.reload()}>
        Reload
      </button>
    </div>
  );
}

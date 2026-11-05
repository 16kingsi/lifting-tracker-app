import { useEffect, useState } from 'react';

// Stage 1 placeholder. It shows the two things worth checking on a phone:
// whether the app is installed, and whether it still opens with no network.
export function App() {
  const installed = window.matchMedia('(display-mode: standalone)').matches;
  const online = useOnlineStatus();

  return (
    <main className="hello">
      <p className="hello__eyebrow">Stage 1</p>
      <h1 className="hello__title">Lifting Tracker</h1>
      <p className="hello__text">Hello, world. The real screens arrive in the next stages.</p>

      <dl className="hello__status">
        <div className="hello__row">
          <dt>Installed as an app</dt>
          <dd className="mono">{installed ? 'Yes' : 'No'}</dd>
        </div>
        <div className="hello__row">
          <dt>Network</dt>
          <dd className="mono">{online ? 'Online' : 'Offline'}</dd>
        </div>
      </dl>
    </main>
  );
}

function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return online;
}

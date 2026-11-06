import { useEffect, useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loading } from './components/Loading';
import { getActiveSession } from './db/queries';
import { navigate, usePath } from './router';
import { ProgressScreen } from './screens/Progress/ProgressScreen';
import { TabScreen } from './screens/TabScreen';
import { WorkoutScreen } from './screens/Workout/WorkoutScreen';

export function App() {
  const path = usePath();
  const [ready, setReady] = useState(false);

  // When the app opens with a workout still in progress, go straight back to it.
  useEffect(() => {
    getActiveSession().then((active) => {
      if (active && window.location.hash !== '#/workout') navigate('/workout');
      setReady(true);
    });
  }, []);

  return (
    <ErrorBoundary>
      {!ready ? (
        <Loading />
      ) : path === '/workout' ? (
        <WorkoutScreen />
      ) : path.startsWith('/progress/') ? (
        <ProgressScreen key={path} exerciseId={path.split('/')[2]} />
      ) : (
        <TabScreen path={path} />
      )}
    </ErrorBoundary>
  );
}

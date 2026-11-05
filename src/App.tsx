import { useEffect, useState } from 'react';
import { getActiveSession } from './db/queries';
import { navigate, usePath } from './router';
import { HomeScreen } from './screens/Home/HomeScreen';
import { WorkoutScreen } from './screens/Workout/WorkoutScreen';

export function App() {
  const path = usePath();
  const [ready, setReady] = useState(false);

  // When the app opens with a workout still in progress, go straight back to it.
  useEffect(() => {
    getActiveSession().then((active) => {
      if (active) navigate('/workout');
      setReady(true);
    });
  }, []);

  if (!ready) return null;
  return path === '/workout' ? <WorkoutScreen /> : <HomeScreen />;
}

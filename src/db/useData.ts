import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './schema';

// While the app isn't on screen it must not touch the database.
//
// Android can freeze a background page at any moment. If that happens in the middle
// of a read (for example a Chrome tab refreshing after the installed app logged a
// set), the frozen page keeps its hold on the database, and every other copy of the
// app can't save anything until it wakes up. So when a page is hidden it stops
// reading, and it lets go of its connection, which reopens by itself when needed.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') db.close({ disableAutoOpen: false });
});

function usePageVisible(): boolean {
  const [visible, setVisible] = useState(document.visibilityState === 'visible');

  useEffect(() => {
    const update = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  return visible;
}

// Reads from the database and re-renders whenever that data changes, but only while
// the page is on screen. While hidden it keeps showing the last value. It returns
// undefined until the first read finishes.
export function useData<T>(query: () => Promise<T>, deps: unknown[] = []): T | undefined {
  const visible = usePageVisible();
  const lastValue = useRef<T | undefined>(undefined);

  const value = useLiveQuery(() => (visible ? query() : lastValue.current), [visible, ...deps]);

  if (value !== undefined) lastValue.current = value;
  return value;
}

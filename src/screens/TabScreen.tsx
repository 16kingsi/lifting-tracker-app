import type { ReactNode } from 'react';
import { ClockIcon, HomeIcon, ListIcon, SlidersIcon } from '../components/Icons';
import { replacePath, replaceScreen, useBackStep } from '../router';
import { HistoryScreen } from './History/HistoryScreen';
import { HomeScreen } from './Home/HomeScreen';
import { RoutineScreen } from './Routine/RoutineScreen';
import { SettingsScreen } from './Settings/SettingsScreen';

const TABS: Array<{ path: string; label: string; icon: ReactNode }> = [
  { path: '/', label: 'Home', icon: <HomeIcon /> },
  { path: '/history', label: 'History', icon: <ClockIcon /> },
  { path: '/routine', label: 'Routine', icon: <ListIcon /> },
  { path: '/settings', label: 'Settings', icon: <SlidersIcon /> },
];

// Everything except the active workout: the current tab, above the navigation bar.
export function TabScreen({ path }: { path: string }) {
  // "/history/abc" belongs to the History tab, and anything unknown shows Home.
  const section = `/${path.split('/')[1]}`;
  const tab = TABS.find((t) => t.path === section)?.path ?? '/';

  // The phone's Back button goes from any other tab to Home, then out of the app.
  useBackStep(tab !== '/', () => replacePath('/'));

  return (
    <div className="screen">
      <div className="tab-page" key={tab}>
        {tab === '/history' ? (
          <HistoryScreen openId={path.split('/')[2] ?? null} />
        ) : tab === '/routine' ? (
          <RoutineScreen />
        ) : tab === '/settings' ? (
          <SettingsScreen />
        ) : (
          <HomeScreen />
        )}
      </div>

      <nav aria-label="Main" className="bottom-nav">
        {TABS.map(({ path: target, label, icon }) => (
          <button
            key={target}
            className="bottom-nav__item"
            aria-current={tab === target ? 'page' : undefined}
            onClick={() => {
              if (tab !== target) replaceScreen(target);
            }}
          >
            {icon}
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

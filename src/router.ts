// A tiny router. The current screen is kept after the # in the address
// (…/lifting-tracker-app/#/workout). GitHub Pages never sees that part, so
// reloading on any screen works and doesn't hit a 404.
import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

function currentPath() {
  return window.location.hash.slice(1) || '/';
}

export function usePath(): string {
  return useSyncExternalStore(subscribe, currentPath);
}

export function navigate(path: string) {
  window.location.hash = path;
}

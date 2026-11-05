// A tiny router. The current screen is kept after the # in the address
// (…/lifting-tracker-app/#/workout). GitHub Pages never sees that part, so
// reloading on any screen works and doesn't hit a 404.
//
// It also handles the phone's back button. Things like an open sheet aren't separate
// addresses, so to let Back close them, a screen registers a "back step" while one
// is open (see useBackStep). A spare "guard" entry is then added to the browser's
// history, so that pressing Back lands here instead of leaving the screen.
import { useEffect, useRef, useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
const backSteps: Array<() => void> = [];

let knownPath = currentPath();
let leaving = false;

function currentPath() {
  return window.location.hash.slice(1) || '/';
}

function notify() {
  knownPath = currentPath();
  listeners.forEach((listener) => listener());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function usePath(): string {
  return useSyncExternalStore(subscribe, currentPath);
}

export function navigate(path: string) {
  window.history.pushState(null, '', `#${path}`);
  notify();
}

// Changes the address without adding a step to the history.
export function replacePath(path: string) {
  window.history.replaceState(null, '', `#${path}`);
  notify();
}

// Leaves the current screen for the one before it, removing its history entries so
// that Back can't return to it.
export function leaveScreen() {
  leaving = true;
  window.history.go(window.history.state?.guard ? -2 : -1);
}

function addGuard() {
  if (!window.history.state?.guard) window.history.pushState({ guard: true }, '');
}

// The browser moved through its history: the phone's Back button, or leaveScreen.
window.addEventListener('popstate', () => {
  const samePath = currentPath() === knownPath;
  notify();

  if (leaving) {
    leaving = false;
    return;
  }
  // Landed on a different screen, or on a guard (going forward): nothing more to do.
  if (!samePath || window.history.state?.guard) return;

  const step = backSteps.at(-1);
  if (step) {
    step();
    addGuard();
  } else {
    // Only the used guard was removed, so carry on to the screen before this one.
    window.history.back();
  }
});

// While `active`, the phone's Back button runs `onBack` instead of leaving the screen.
// The most recently activated step runs first, so the top sheet closes first.
export function useBackStep(active: boolean, onBack: () => void) {
  const latestOnBack = useRef(onBack);
  latestOnBack.current = onBack;

  useEffect(() => {
    if (!active) return;
    const step = () => latestOnBack.current();
    backSteps.push(step);
    addGuard();
    return () => {
      backSteps.splice(backSteps.indexOf(step), 1);
    };
  }, [active]);
}

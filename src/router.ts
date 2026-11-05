// A tiny router. The current screen is kept after the # in the address
// (…/lifting-tracker-app/#/workout). GitHub Pages never sees that part, so
// reloading on any screen works and doesn't hit a 404.
//
// It also handles the phone's back button. Things like an open sheet aren't separate
// addresses, so to let Back close them, a screen registers a "back step" while one
// is open (see useBackStep). A spare "guard" entry is then added to the browser's
// history, so that pressing Back lands here instead of leaving the screen.
//
// The four tabs share one history entry, and a workout goes on top of it. The tabs
// other than Home register a back step that goes Home, so Back always goes
// tab → Home → out of the app.
import { useEffect, useRef, useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
const backSteps: Array<() => void> = [];

let knownPath = currentPath();
let leaving = false; // moving back to the entry below the current screen
let leaveTo: string | null = null; // the address that entry should then have
let removingGuard = false;

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
  window.history.pushState({ pushed: true }, '', `#${path}`);
  notify();
}

// Changes the address without adding a step to the history.
export function replacePath(path: string) {
  if (leaving) return; // the move already under way decides where this ends up
  window.history.replaceState(null, '', `#${path}`);
  notify();
}

// Leaves the current screen for the one below it, removing its history entries so
// that Back can't return to it. `thenPath` shows a different screen in that one's place.
export function leaveScreen(thenPath?: string) {
  leaving = true;
  leaveTo = thenPath ?? null;
  window.history.go(window.history.state?.guard ? -2 : -1);
}

// Moves between the tabs, without adding to the history.
export function switchTab(path: string) {
  if (leaving) {
    leaveTo = path;
  } else if (window.history.state?.guard) {
    // The address has to change on the entry beneath the guard, not on the guard.
    leaving = true;
    leaveTo = path;
    window.history.back();
  } else {
    replacePath(path);
  }
}

function addGuard() {
  if (!window.history.state?.guard) window.history.pushState({ guard: true }, '');
}

// Once the screen has settled: a guard is wanted while any back step is registered,
// and a spare one is removed, so that Back never appears to do nothing.
function syncGuardSoon() {
  setTimeout(() => {
    if (leaving || removingGuard) return;
    if (backSteps.length > 0) {
      addGuard();
    } else if (window.history.state?.guard) {
      removingGuard = true;
      window.history.back();
    }
  }, 0);
}

// The browser moved through its history: the phone's Back button, or the functions above.
window.addEventListener('popstate', () => {
  if (removingGuard) {
    removingGuard = false;
    return;
  }

  if (leaving) {
    // Landed on a guard left beneath this screen, so carry on past it.
    if (window.history.state?.guard) {
      window.history.back();
      return;
    }
    leaving = false;
    if (leaveTo) window.history.replaceState(null, '', `#${leaveTo}`);
    leaveTo = null;
    notify();
    syncGuardSoon(); // a step can stay registered across the move, as between two tabs
    return;
  }

  const samePath = currentPath() === knownPath;
  notify();

  // Landed on a different screen, or on a guard (going forward): nothing more to do.
  if (!samePath || window.history.state?.guard) return;

  const step = backSteps.at(-1);
  if (step) {
    step();
    syncGuardSoon();
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
      syncGuardSoon();
    };
  }, [active]);
}

// A workout opened straight from its address (the phone restoring the app, say) has
// nothing beneath it to leave to, so give it Home.
if (currentPath() === '/workout' && !window.history.state) {
  window.history.replaceState(null, '', '#/');
  navigate('/workout');
}

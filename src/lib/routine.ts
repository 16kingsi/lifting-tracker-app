// Swaps an item with its neighbour. Moving past either end changes nothing.
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return items;
  const moved = [...items];
  [moved[from], moved[to]] = [moved[to], moved[from]];
  return moved;
}

// Why a name can't be used, or null if it can. `otherNames` are the names of every
// other exercise, in lower case.
export function nameProblem(name: string, otherNames: string[]): string | null {
  const trimmed = name.trim();
  if (trimmed === '') return 'Enter a name.';
  if (otherNames.includes(trimmed.toLowerCase())) return 'Another exercise already has this name.';
  return null;
}

import type { TemplateId } from '../types';

// The day after the most recent completed workout. Day A if there isn't one yet.
export function nextTemplateId(lastCompleted: TemplateId | null): TemplateId {
  return lastCompleted === 'A' ? 'B' : 'A';
}

// All weight conversion lives in this one file.
// Logged weights are never changed: 20 kg stays 20 kg. These functions only work
// out pounds for charts and comparisons, and rounding happens only for display.
import type { Unit } from '../types';

export const LB_PER_KG = 2.20462262;

// The exact weight in pounds, for charts and comparisons. Not rounded.
export function toLb(value: number, unit: Unit): number {
  return unit === 'kg' ? value * LB_PER_KG : value;
}

// Pounds as text for display, to one decimal place: 84.878 becomes "84.9".
export function formatLb(lb: number): string {
  return String(Math.round(lb * 10) / 10);
}

// How much the +/- buttons change the weight.
export function stepFor(unit: Unit): number {
  return unit === 'kg' ? 2.5 : 5;
}

// One tap of + (direction 1) or - (direction -1). Never goes below zero.
export function stepWeight(value: number, unit: Unit, direction: 1 | -1): number {
  const next = value + direction * stepFor(unit);
  return Math.max(0, Math.round(next * 100) / 100);
}

// Used when the lb/kg toggle is tapped before a set is logged. The result snaps
// to the nearest step, because that is a weight you can actually load on a bar.
export function convertForEntry(value: number, from: Unit, to: Unit): number {
  if (from === to) return value;
  const exact = from === 'kg' ? value * LB_PER_KG : value / LB_PER_KG;
  const step = stepFor(to);
  return Math.round(exact / step) * step;
}

// Picks round numbers for a chart's value axis, so the gridlines land on values
// like 60, 70, 80 rather than 63.2, 71.9 and so on.

export interface Scale {
  lo: number;
  hi: number;
  ticks: number[]; // from lo up to hi
}

const NICE_FACTORS = [1, 2, 2.5, 5, 10];
const NICE_SECONDS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];

function niceStep(rough: number, seconds: boolean): number {
  if (seconds) return NICE_SECONDS.find((s) => s >= rough) ?? Math.ceil(rough / 3600) * 3600;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  return NICE_FACTORS.map((f) => f * magnitude).find((s) => s >= rough)!;
}

// About `steps` gaps between gridlines (one more if that avoids a much coarser
// step). `seconds` uses steps that suit times (15 s, 1 min).
export function niceScale(min: number, max: number, steps = 4, seconds = false): Scale {
  // A flat line still needs some height around it.
  const span = max - min || Math.max(Math.abs(max) * 0.2, 1);
  const bottom = max === min ? min - span / 2 : min;
  const fits = (lo: number, step: number, n: number) => lo + step * n > max || (max !== min && lo + step * n === max);

  let step = niceStep(span / steps, seconds);
  for (;;) {
    const lo = Math.max(min >= 0 ? 0 : -Infinity, Math.floor(bottom / step) * step); // never below zero
    // The rounded-down start can push the top out of reach: try one more gap, then a bigger step.
    const count = [steps, steps + 1].find((n) => fits(lo, step, n));
    if (count !== undefined) {
      const ticks = Array.from({ length: count + 1 }, (_, i) => Math.round((lo + step * i) * 1000) / 1000);
      return { lo, hi: ticks[count], ticks };
    }
    step = niceStep(step * 1.01, seconds);
  }
}

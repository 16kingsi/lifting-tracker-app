import type { KeyboardEvent, PointerEvent } from 'react';
import { niceScale } from '../../lib/chartScale';
import { formatDuration, formatShortDate } from '../../lib/format';
import { formatValue, METRIC_NAMES, type Metric, type ProgressPoint } from '../../lib/progress';
import { formatLb } from '../../lib/units';

// A hand-drawn SVG line chart. The drawing is 330 × 186 units and scales to fit the
// card's width.
const WIDTH = 330;
const HEIGHT = 186;
const PLOT_TOP = 10;
const PLOT_BOTTOM = 160;
const PLOT_RIGHT = 326;
const MAX_MARKERS = 40; // more dots than this would blur together, so just draw the line

interface ProgressChartProps {
  points: ProgressPoint[]; // oldest first, at least one
  metric: Metric;
  selected: number; // index into points
  onSelect: (index: number) => void;
}

export function ProgressChart({ points, metric, selected, onSelect }: ProgressChartProps) {
  const values = points.map((p) => p.value);
  const scale = niceScale(Math.min(...values), Math.max(...values), 4, metric === 'hold');
  const tickText = (v: number) =>
    metric === 'hold' ? formatDuration(v) : metric === 'reps' ? String(v) : formatLb(v);

  // Room on the left for the longest tick label, at about 7 units per character.
  const plotLeft = Math.max(...scale.ticks.map((t) => tickText(t).length)) * 7 + 6;

  const first = points[0].date;
  const last = points[points.length - 1].date;
  const x = (date: number) =>
    last === first
      ? (plotLeft + PLOT_RIGHT) / 2
      : plotLeft + ((date - first) / (last - first)) * (PLOT_RIGHT - plotLeft);
  const y = (value: number) =>
    PLOT_BOTTOM - ((value - scale.lo) / (scale.hi - scale.lo)) * (PLOT_BOTTOM - PLOT_TOP);

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const dateLabels =
    last === first
      ? [{ date: first, anchor: 'middle' as const }]
      : [
          { date: first, anchor: 'start' as const },
          { date: (first + last) / 2, anchor: 'middle' as const },
          { date: last, anchor: 'end' as const },
        ];

  // Tapping or dragging anywhere on the chart picks the workout closest in time.
  function pick(event: PointerEvent<SVGSVGElement>) {
    event.preventDefault(); // a tap shouldn't leave the keyboard focus outline behind
    const box = event.currentTarget.getBoundingClientRect();
    const tapX = ((event.clientX - box.left) / box.width) * WIDTH;
    let nearest = 0;
    points.forEach((p, i) => {
      if (Math.abs(x(p.date) - tapX) < Math.abs(x(points[nearest].date) - tapX)) nearest = i;
    });
    onSelect(nearest);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') onSelect(Math.max(0, selected - 1));
    else if (event.key === 'ArrowRight') onSelect(Math.min(points.length - 1, selected + 1));
    else return;
    event.preventDefault();
  }

  const describe = (p: ProgressPoint) => {
    const { number, unit } = formatValue(metric, p.value);
    return `${number}${unit ? ` ${unit}` : ''}`;
  };
  const summary =
    `${METRIC_NAMES[metric].label}${metric === 'top' || metric === 'e1rm' ? ' in pounds' : ''}, ` +
    `${formatShortDate(first)} to ${formatShortDate(last)}, ` +
    `from ${describe(points[0])} to ${describe(points[points.length - 1])}. ` +
    'Use the left and right arrow keys to read each workout.';

  const chosen = points[selected];

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={summary}
      tabIndex={0}
      onPointerDown={pick}
      onPointerMove={(event) => {
        if (event.buttons) pick(event);
      }}
      onKeyDown={onKeyDown}
    >
      <g className="chart__grid">
        {scale.ticks.map((tick) => (
          <path key={tick} d={`M${plotLeft} ${y(tick)}H${PLOT_RIGHT}`} />
        ))}
      </g>
      <g className="chart__labels">
        {scale.ticks.map((tick) => (
          <text key={tick} x={0} y={y(tick) + 4}>
            {tickText(tick)}
          </text>
        ))}
        {dateLabels.map(({ date, anchor }) => (
          <text
            key={anchor}
            x={anchor === 'start' ? plotLeft : anchor === 'end' ? PLOT_RIGHT : x(date)}
            y={HEIGHT - 2}
            textAnchor={anchor}
          >
            {formatShortDate(date)}
          </text>
        ))}
      </g>

      {/* The crosshair on the chosen workout */}
      <path className="chart__crosshair" d={`M${x(chosen.date)} ${PLOT_TOP}V${PLOT_BOTTOM}`} />

      <path className="chart__line" d={line} />

      {points.map((p, i) =>
        points.length <= MAX_MARKERS || i === selected ? (
          <circle
            key={p.sessionId}
            className={`chart__dot ${p.loggedInKg ? 'chart__dot--kg' : ''}`}
            cx={x(p.date)}
            cy={y(p.value)}
            r={i === selected ? 6 : 4.5}
          />
        ) : null,
      )}
    </svg>
  );
}

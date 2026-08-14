/** Activity card: streak/total stats + a GitHub-style contribution heatmap. */

import type { ActivityData } from "../github/types.js";
import { cardFrame, group, svgRoot, text } from "./svg.js";
import { heatmapRamp, type Theme } from "./theme.js";
import { formatNumber } from "./utils.js";

const WIDTH = 560;
const HEIGHT = 200;
const PAD = 16;
const CELL = 8;
const GAP = 2;
const STEP = CELL + GAP;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** UTC weekday, 0 = Sunday. */
function weekday(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

function bucket(count: number, max: number): number {
  if (count <= 0 || max <= 0) return 0;
  const r = count / max;
  if (r <= 0.25) return 1;
  if (r <= 0.5) return 2;
  if (r <= 0.75) return 3;
  return 4;
}

function statBlock(
  value: string,
  label: string,
  centerX: number,
  color: string,
  t: Theme,
): string {
  return group([
    text(value, {
      x: centerX,
      y: 60,
      fill: color,
      size: 22,
      weight: 700,
      anchor: "middle",
      family: t.monoFamily,
    }),
    text(label, {
      x: centerX,
      y: 76,
      fill: t.muted,
      size: 10.5,
      anchor: "middle",
    }),
  ]);
}

function heatmap(data: ActivityData, t: Theme): string {
  const ramp = heatmapRamp(t);
  const gridTop = 108;
  const startX = PAD;

  const cells: string[] = [];
  const monthLabels: string[] = [];
  let lastMonth = -1;

  data.weeks.forEach((week, c) => {
    const x = startX + c * STEP;
    if (week.length) {
      const m = parseInt(week[0].date.slice(5, 7), 10) - 1;
      if (m !== lastMonth) {
        // Avoid crowding: only label if a few columns since the last one.
        monthLabels.push(
          text(MONTHS[m], { x, y: gridTop - 6, fill: t.muted, size: 9 }),
        );
        lastMonth = m;
      }
    }
    for (const day of week) {
      const row = weekday(day.date);
      const y = gridTop + row * STEP;
      cells.push(
        `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${ramp[bucket(day.count, data.maxCount)]}"/>`,
      );
    }
  });

  return monthLabels.join("") + cells.join("");
}

export function renderActivityCard(
  data: ActivityData,
  t: Theme,
  updated: string,
): string {
  const usable = WIDTH - PAD * 2;
  const c1 = PAD + usable * (1 / 6);
  const c2 = PAD + usable * (3 / 6);
  const c3 = PAD + usable * (5 / 6);

  const body =
    cardFrame({
      width: WIDTH,
      height: HEIGHT,
      bg: t.bg,
      border: t.border,
      radius: 10,
      borderWidth: 1,
    }) +
    `<rect x="${PAD}" y="20" width="4" height="18" rx="2" fill="${t.accent}"/>` +
    text("Contribution Activity", {
      x: PAD + 14,
      y: 34,
      fill: t.fg,
      size: 17,
      weight: 700,
    }) +
    statBlock(formatNumber(data.totalContributions), "contributions (1y)", c1, t.green, t) +
    statBlock(`${data.currentStreak.length}`, "current streak", c2, t.orange, t) +
    statBlock(`${data.longestStreak.length}`, "longest streak", c3, t.yellow, t) +
    heatmap(data, t) +
    text(`updated ${updated}`, {
      x: WIDTH - PAD,
      y: HEIGHT - 10,
      fill: t.muted,
      size: 9,
      anchor: "end",
      opacity: 0.55,
    });

  return svgRoot(body, {
    width: WIDTH,
    height: HEIGHT,
    title: "Contribution activity",
    desc: `${data.totalContributions} contributions in the last year, current streak ${data.currentStreak.length} days, longest ${data.longestStreak.length} days.`,
    fontFamily: t.fontFamily,
  });
}

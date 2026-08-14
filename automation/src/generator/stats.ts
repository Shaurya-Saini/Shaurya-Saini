/** Stats card: a stat list on the left + a GitHub-style rank ring on the right. */

import type { StatsData } from "../github/types.js";
import { icon, type IconName } from "./icons.js";
import { calculateRank } from "./rank.js";
import { cardFrame, group, progressRing, rect, svgRoot, text } from "./svg.js";
import { layout, type Theme } from "./theme.js";
import { formatNumber } from "./utils.js";

const WIDTH = 500;
const HEIGHT = 220;

// Rank ring geometry (right side).
const RING = { cx: 416, cy: 120, r: 44, stroke: 8 };
const LEFT_VALUE_RIGHT = 336;

interface Row {
  icon: IconName;
  color: (t: Theme) => string;
  label: string;
  value: number;
}

function statRow(row: Row, top: number, t: Theme): string {
  const baseline = top + 12;
  return group([
    icon(row.icon, layout.padding, top, 16, row.color(t)),
    text(row.label, {
      x: layout.padding + 26,
      y: baseline,
      fill: t.muted,
      size: 13,
    }),
    text(formatNumber(row.value), {
      x: LEFT_VALUE_RIGHT,
      y: baseline,
      fill: t.fg,
      size: 14,
      weight: 600,
      anchor: "end",
      family: t.monoFamily,
    }),
  ]);
}

function rankColor(level: string, t: Theme): string {
  if (level === "S" || level === "A+") return t.green;
  if (level.startsWith("A")) return t.yellow;
  if (level.startsWith("B")) return t.blue;
  return t.orange;
}

function rankRing(data: StatsData, t: Theme): string {
  const rank = calculateRank(data);
  const color = rankColor(rank.level, t);
  return group([
    text("RANK", {
      x: RING.cx,
      y: 58,
      fill: t.muted,
      size: 9,
      anchor: "middle",
      letterSpacing: 2,
      opacity: 0.8,
    }),
    progressRing({
      cx: RING.cx,
      cy: RING.cy,
      r: RING.r,
      strokeWidth: RING.stroke,
      progress: rank.progress,
      track: t.border,
      fill: color,
    }),
    text(rank.level, {
      x: RING.cx,
      y: RING.cy + 9,
      fill: color,
      size: 30,
      weight: 700,
      anchor: "middle",
      family: t.monoFamily,
    }),
    text(`Top ${rank.percentile}%`, {
      x: RING.cx,
      y: RING.cy + RING.r + 20,
      fill: t.muted,
      size: 10.5,
      anchor: "middle",
    }),
  ]);
}

export function renderStatsCard(data: StatsData, t: Theme, updated: string): string {
  const rows: Row[] = [
    { icon: "repo", color: (x) => x.blue, label: "Repositories", value: data.repositories },
    { icon: "star", color: (x) => x.yellow, label: "Stars earned", value: data.stars },
    { icon: "fork", color: (x) => x.aqua, label: "Forks", value: data.forks },
    { icon: "followers", color: (x) => x.purple, label: "Followers", value: data.followers },
    { icon: "pr", color: (x) => x.green, label: "Pull requests", value: data.pullRequests },
    { icon: "issue", color: (x) => x.orange, label: "Issues", value: data.issues },
    { icon: "activity", color: (x) => x.red, label: "Contributions (1y)", value: data.contributionsLastYear },
  ];

  const rowTop = 62;
  const rowGap = 20;

  const body =
    cardFrame({
      width: WIDTH,
      height: HEIGHT,
      bg: t.bg,
      border: t.border,
      radius: layout.radius,
      borderWidth: layout.borderWidth,
    }) +
    `<rect x="${layout.padding}" y="22" width="4" height="18" rx="2" fill="${t.accent}"/>` +
    text(`${data.name} — GitHub Stats`, {
      x: layout.padding + 14,
      y: layout.headerY + 2,
      fill: t.fg,
      size: 16,
      weight: 700,
    }) +
    // header divider
    rect({
      x: layout.padding,
      y: 48,
      width: WIDTH - layout.padding * 2,
      height: 1,
      fill: t.border,
    }) +
    rows.map((r, i) => statRow(r, rowTop + i * rowGap, t)).join("") +
    rankRing(data, t) +
    text(`updated ${updated}`, {
      x: WIDTH - layout.padding,
      y: HEIGHT - 12,
      fill: t.muted,
      size: 9,
      anchor: "end",
      opacity: 0.55,
    });

  return svgRoot(body, {
    width: WIDTH,
    height: HEIGHT,
    title: `${data.name}'s GitHub statistics`,
    desc: `Repositories ${data.repositories}, stars ${data.stars}, followers ${data.followers}.`,
    fontFamily: t.fontFamily,
  });
}

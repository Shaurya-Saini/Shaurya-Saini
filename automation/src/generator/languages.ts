/** Languages card: a stacked usage bar + a two-column legend. */

import type { LanguagesData } from "../github/types.js";
import { cardFrame, circle, group, rect, svgRoot, text } from "./svg.js";
import { layout, type Theme } from "./theme.js";

const WIDTH = 500;
const HEIGHT = 200;
const BAR_ID = "langbar";

export function renderLanguagesCard(
  data: LanguagesData,
  t: Theme,
  updated: string,
): string {
  const pad = layout.padding;
  const barX = pad;
  const barY = 58;
  const barW = WIDTH - pad * 2;
  const barH = 12;

  // Stacked bar via a rounded clip so only the outer corners are rounded.
  let cursor = barX;
  const segments: string[] = [];
  for (const lang of data.languages) {
    const w = (lang.percent / 100) * barW;
    if (w <= 0) continue;
    segments.push(rect({ x: cursor, y: barY, width: w, height: barH, fill: lang.color }));
    cursor += w;
  }
  // Filler covers rounding remainder + "other" languages.
  if (cursor < barX + barW) {
    segments.push(
      rect({ x: cursor, y: barY, width: barX + barW - cursor, height: barH, fill: t.border }),
    );
  }

  const bar =
    `<clipPath id="${BAR_ID}"><rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="${barH / 2}"/></clipPath>` +
    `<g clip-path="url(#${BAR_ID})">${segments.join("")}</g>`;

  // Legend: two columns.
  const legendTop = 100;
  const rowH = 26;
  const colW = (WIDTH - pad * 2) / 2;
  const legend = data.languages
    .map((lang, i) => {
      const col = i % 2;
      const rowN = Math.floor(i / 2);
      const colX = pad + col * colW;
      const y = legendTop + rowN * rowH;
      return group([
        circle(colX + 5, y - 4, 5, lang.color),
        text(lang.name, { x: colX + 18, y, fill: t.fg, size: 12.5 }),
        text(`${lang.percent}%`, {
          x: colX + colW - 12,
          y,
          fill: t.muted,
          size: 12,
          anchor: "end",
          family: t.monoFamily,
        }),
      ]);
    })
    .join("");

  const empty =
    data.languages.length === 0
      ? text("No language data available", {
          x: WIDTH / 2,
          y: 120,
          fill: t.muted,
          size: 13,
          anchor: "middle",
        })
      : "";

  const body =
    cardFrame({
      width: WIDTH,
      height: HEIGHT,
      bg: t.bg,
      border: t.border,
      radius: layout.radius,
      borderWidth: layout.borderWidth,
    }) +
    `<rect x="${pad}" y="22" width="4" height="18" rx="2" fill="${t.accent}"/>` +
    text("Most Used Languages", {
      x: pad + 14,
      y: layout.headerY + 2,
      fill: t.fg,
      size: 17,
      weight: 700,
    }) +
    (data.languages.length ? bar + legend : empty) +
    text(`updated ${updated}`, {
      x: WIDTH - pad,
      y: HEIGHT - 12,
      fill: t.muted,
      size: 9,
      anchor: "end",
      opacity: 0.55,
    });

  return svgRoot(body, {
    width: WIDTH,
    height: HEIGHT,
    title: "Most used languages",
    desc: data.languages.map((l) => `${l.name} ${l.percent}%`).join(", "),
    fontFamily: t.fontFamily,
  });
}

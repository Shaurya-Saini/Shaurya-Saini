/**
 * A tiny monochrome icon set drawn in a 16x16 coordinate space. Each icon is a
 * function of a colour and returns an SVG fragment; render() places and scales it.
 */

export type IconName =
  | "repo"
  | "star"
  | "fork"
  | "followers"
  | "pr"
  | "issue"
  | "activity";

const icons: Record<IconName, (c: string) => string> = {
  star: (c) =>
    `<path d="M8 1.6l1.8 4.02 4.38.38-3.32 2.88 1 4.28L8 10.9l-3.86 2.24 1-4.28L1.82 6l4.38-.38z" fill="${c}"/>`,

  repo: (c) =>
    `<g fill="none" stroke="${c}" stroke-width="1.4" stroke-linejoin="round">` +
    `<rect x="3" y="2.5" width="10" height="11" rx="1.4"/>` +
    `<path d="M5.6 2.5 V13.5"/></g>`,

  fork: (c) =>
    `<g stroke="${c}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round">` +
    `<circle cx="4" cy="4" r="1.9" fill="${c}" stroke="none"/>` +
    `<circle cx="12" cy="4" r="1.9" fill="${c}" stroke="none"/>` +
    `<circle cx="8" cy="12" r="1.9" fill="${c}" stroke="none"/>` +
    `<path d="M4 6 V8.4"/><path d="M12 6 V8.4"/>` +
    `<path d="M4 8.4 H12"/><path d="M8 8.4 V10.1"/></g>`,

  followers: (c) =>
    `<g fill="${c}"><circle cx="8" cy="5" r="2.7"/>` +
    `<path d="M2.6 13.4 a5.4 5.4 0 0 1 10.8 0 z"/></g>`,

  pr: (c) =>
    `<g stroke="${c}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round">` +
    `<circle cx="4" cy="4" r="1.9" fill="${c}" stroke="none"/>` +
    `<circle cx="4" cy="12" r="1.9" fill="${c}" stroke="none"/>` +
    `<circle cx="12" cy="12" r="1.9" fill="${c}" stroke="none"/>` +
    `<path d="M4 6 V10"/><path d="M12 10 V7 a2 2 0 0 0-2-2 H8"/>` +
    `<path d="M9.6 3.4 L7.6 5 L9.6 6.6"/></g>`,

  issue: (c) =>
    `<g><circle cx="8" cy="8" r="5.2" fill="none" stroke="${c}" stroke-width="1.5"/>` +
    `<circle cx="8" cy="8" r="1.4" fill="${c}"/></g>`,

  activity: (c) =>
    `<g fill="${c}">` +
    `<rect x="2.4" y="9" width="2.2" height="4.6" rx="0.6"/>` +
    `<rect x="6.9" y="5.4" width="2.2" height="8.2" rx="0.6"/>` +
    `<rect x="11.4" y="7.4" width="2.2" height="6.2" rx="0.6"/></g>`,
};

/** Render an icon at (x, y) scaled to `size` px, tinted `color`. */
export function icon(
  name: IconName,
  x: number,
  y: number,
  size: number,
  color: string,
): string {
  const s = size / 16;
  return `<g transform="translate(${x} ${y}) scale(${s})">${icons[name](color)}</g>`;
}

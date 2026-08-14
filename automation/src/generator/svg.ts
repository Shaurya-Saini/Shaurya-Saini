/**
 * Low-level SVG building blocks. Everything here is a pure function returning an
 * SVG string fragment. No card-specific knowledge lives here — see stats.ts etc.
 */

export function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const attr = (name: string, value: string | number | undefined): string =>
  value === undefined || value === "" ? "" : ` ${name}="${value}"`;

export interface TextOptions {
  x: number;
  y: number;
  fill: string;
  size?: number;
  weight?: number | string;
  anchor?: "start" | "middle" | "end";
  family?: string;
  opacity?: number;
  letterSpacing?: number;
}

export function text(content: string, o: TextOptions): string {
  return (
    `<text x="${o.x}" y="${o.y}" fill="${o.fill}"` +
    ` font-size="${o.size ?? 13}"` +
    attr("font-weight", o.weight) +
    attr("text-anchor", o.anchor) +
    attr("font-family", o.family) +
    attr("opacity", o.opacity) +
    attr("letter-spacing", o.letterSpacing) +
    `>${escapeXml(content)}</text>`
  );
}

export interface RectOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

export function rect(o: RectOptions): string {
  return (
    `<rect x="${o.x}" y="${o.y}" width="${o.width}" height="${o.height}"` +
    attr("rx", o.rx) +
    attr("fill", o.fill ?? "none") +
    attr("stroke", o.stroke) +
    attr("stroke-width", o.strokeWidth) +
    attr("opacity", o.opacity) +
    ` />`
  );
}

export function circle(
  cx: number,
  cy: number,
  r: number,
  fill: string,
  opacity?: number,
): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${attr(
    "opacity",
    opacity,
  )} />`;
}

export function path(d: string, fill: string, opacity?: number): string {
  return `<path d="${d}" fill="${fill}"${attr("opacity", opacity)} />`;
}

export interface RingOptions {
  cx: number;
  cy: number;
  r: number;
  strokeWidth: number;
  /** 0..100 fill amount. */
  progress: number;
  track: string; // background ring colour
  fill: string; // progress colour
}

/** A circular progress ring (background track + rounded progress arc, from top). */
export function progressRing(o: RingOptions): string {
  const c = 2 * Math.PI * o.r;
  const pct = Math.max(0, Math.min(100, o.progress));
  const offset = c * (1 - pct / 100);
  return (
    `<circle cx="${o.cx}" cy="${o.cy}" r="${o.r}" fill="none" stroke="${o.track}" stroke-width="${o.strokeWidth}"/>` +
    `<circle cx="${o.cx}" cy="${o.cy}" r="${o.r}" fill="none" stroke="${o.fill}"` +
    ` stroke-width="${o.strokeWidth}" stroke-linecap="round"` +
    ` stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"` +
    ` transform="rotate(-90 ${o.cx} ${o.cy})"/>`
  );
}

export function group(children: string[], transform?: string): string {
  return `<g${attr("transform", transform)}>${children.join("")}</g>`;
}

export interface SvgRootOptions {
  width: number;
  height: number;
  title: string;
  desc?: string;
  fontFamily: string;
}

/** Wrap fragments in a self-contained, accessible root <svg>. */
export function svgRoot(body: string, o: SvgRootOptions): string {
  return (
    `<svg width="${o.width}" height="${o.height}" viewBox="0 0 ${o.width} ${o.height}"` +
    ` xmlns="http://www.w3.org/2000/svg" role="img"` +
    ` aria-label="${escapeXml(o.title)}"` +
    ` font-family="${o.fontFamily}">` +
    `<title>${escapeXml(o.title)}</title>` +
    (o.desc ? `<desc>${escapeXml(o.desc)}</desc>` : "") +
    body +
    `</svg>`
  );
}

/** The rounded card frame every card shares. */
export function cardFrame(opts: {
  width: number;
  height: number;
  bg: string;
  border: string;
  radius: number;
  borderWidth: number;
}): string {
  const inset = opts.borderWidth / 2;
  return rect({
    x: inset,
    y: inset,
    width: opts.width - opts.borderWidth,
    height: opts.height - opts.borderWidth,
    rx: opts.radius,
    fill: opts.bg,
    stroke: opts.border,
    strokeWidth: opts.borderWidth,
  });
}

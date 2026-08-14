/**
 * The shared design system. All three cards import from here so they read as one
 * family. Palette is Gruvbox (dark), matching the existing profile README.
 */

export interface Theme {
  // Surfaces
  bg: string; // card background
  bgAlt: string; // inset / empty-cell surface
  border: string;
  // Text
  fg: string; // primary text
  muted: string; // secondary text / labels
  // Accents (Gruvbox bright)
  red: string;
  green: string;
  yellow: string;
  blue: string;
  purple: string;
  aqua: string;
  orange: string;
  gray: string;
  // Semantic
  accent: string; // primary accent (titles, highlights)
  // Typography
  fontFamily: string;
  monoFamily: string;
}

export const gruvbox: Theme = {
  bg: "#282828",
  bgAlt: "#32302f",
  border: "#3c3836",

  fg: "#EBDBB2",
  muted: "#A89984",

  red: "#FB4934",
  green: "#B8BB26",
  yellow: "#FABD2F",
  blue: "#83A598",
  purple: "#D3869B",
  aqua: "#8EC07C",
  orange: "#FE8019",
  gray: "#928374",

  accent: "#FABD2F",

  fontFamily:
    "'Segoe UI', -apple-system, BlinkMacSystemFont, Ubuntu, Roboto, Helvetica, Arial, sans-serif",
  monoFamily:
    "ui-monospace, 'SF Mono', 'Cascadia Code', 'JetBrains Mono', Consolas, 'Liberation Mono', Menlo, monospace",
};

/** Shared card geometry so the three cards line up cleanly side-by-side. */
export const layout = {
  padding: 24,
  headerY: 34,
  radius: 10,
  borderWidth: 1,
} as const;

/**
 * Contribution heatmap colour ramp: index 0 = no contributions, 1..4 = quartiles.
 * Built from the Gruvbox green so it sits inside the same palette.
 */
export const heatmapRamp = (t: Theme): string[] => [
  t.border, // 0 — empty
  "#4e5622", // 1
  "#79861f", // 2
  "#a0aa24", // 3
  t.green, // 4 — most
];

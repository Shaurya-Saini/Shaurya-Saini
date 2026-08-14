/** Turns normalized ProfileData into the three finished SVG strings. */

import type { ProfileData } from "../github/types.js";
import { renderActivityCard } from "./activity.js";
import { renderLanguagesCard } from "./languages.js";
import { renderStatsCard } from "./stats.js";
import { gruvbox, type Theme } from "./theme.js";
import { formatDate } from "./utils.js";

export interface RenderedCards {
  stats: string;
  languages: string;
  activity: string;
}

export function renderCards(profile: ProfileData, theme: Theme = gruvbox): RenderedCards {
  const updated = formatDate(profile.generatedAt.slice(0, 10));
  return {
    stats: renderStatsCard(profile.stats, theme, updated),
    languages: renderLanguagesCard(profile.languages, theme, updated),
    activity: renderActivityCard(profile.activity, theme, updated),
  };
}

/**
 * Pure data-processing layer: raw GitHub shapes -> normalized card data.
 * No network, no SVG. Everything here is unit-testable in isolation.
 */

import type { Config } from "../config.js";
import { round } from "../generator/utils.js";
import type {
  ActivityData,
  ContributionDay,
  LanguagesData,
  ProfileData,
  RawRepository,
  RawUserCounts,
  StatsData,
  Streak,
} from "./types.js";
import type { RawProfile } from "./client.js";

const FALLBACK_LANG_COLOR = "#8b949e";

/** Apply the include/exclude repo rules from config, once. */
function filterRepos(repos: RawRepository[], config: Config): RawRepository[] {
  const excluded = new Set(config.excludeRepos.map((r) => r.toLowerCase()));
  return repos.filter((r) => {
    if (excluded.has(r.name.toLowerCase())) return false;
    if (!config.languages.includeForks && r.isFork) return false;
    if (!config.languages.includeArchived && r.isArchived) return false;
    return true;
  });
}

export function buildStats(
  counts: RawUserCounts,
  repos: RawRepository[],
): StatsData {
  const stars = repos.reduce((s, r) => s + r.stargazerCount, 0);
  const forks = repos.reduce((s, r) => s + r.forkCount, 0);
  const cc = counts.contributionsCollection;
  return {
    name: counts.name || counts.login,
    login: counts.login,
    repositories: repos.length,
    stars,
    forks,
    followers: counts.followers.totalCount,
    pullRequests: counts.pullRequests.totalCount,
    issues: counts.issues.totalCount,
    contributionsLastYear: cc.contributionCalendar.totalContributions,
    commitsLastYear: cc.totalCommitContributions,
    reviewsLastYear: cc.totalPullRequestReviewContributions,
  };
}

export function aggregateLanguages(
  repos: RawRepository[],
  config: Config,
): LanguagesData {
  const hide = new Set(config.languages.hide.map((l) => l.toLowerCase()));
  const byName = new Map<string, { bytes: number; color: string }>();

  for (const repo of repos) {
    for (const edge of repo.languages.edges) {
      const name = edge.node.name;
      if (hide.has(name.toLowerCase())) continue;
      const prev = byName.get(name);
      byName.set(name, {
        bytes: (prev?.bytes ?? 0) + edge.size,
        color: prev?.color ?? edge.node.color ?? FALLBACK_LANG_COLOR,
      });
    }
  }

  const total = [...byName.values()].reduce((s, v) => s + v.bytes, 0) || 1;
  const all = [...byName.entries()]
    .map(([name, v]) => ({
      name,
      color: v.color,
      bytes: v.bytes,
      percent: round((v.bytes / total) * 100, 1),
    }))
    .sort((a, b) => b.bytes - a.bytes);

  const top = all.slice(0, config.languages.maxLanguages);
  const shownPercent = top.reduce((s, l) => s + l.percent, 0);
  const otherPercent = Math.max(0, round(100 - shownPercent, 1));

  return { languages: top, totalBytes: total, otherPercent };
}

/**
 * Compute current + longest contribution streaks from a chronological list of
 * daily counts. `days` must be ascending by date and contiguous (GitHub's
 * calendar is), which is what makes array-adjacency equal to date-adjacency.
 */
export function computeStreaks(days: ContributionDay[]): {
  current: Streak;
  longest: Streak;
} {
  let longest: Streak = { length: 0 };
  let run = 0;
  let runStart = "";
  for (const d of days) {
    if (d.count > 0) {
      if (run === 0) runStart = d.date;
      run++;
      if (run > longest.length) {
        longest = { length: run, start: runStart, end: d.date };
      }
    } else {
      run = 0;
    }
  }

  // Current streak, walking backwards. Today counting 0 does NOT break the
  // streak (the day is not over) — we simply start from yesterday.
  let i = days.length - 1;
  if (i >= 0 && days[i].count === 0) i--;
  let count = 0;
  let start = "";
  let end = "";
  while (i >= 0 && days[i].count > 0) {
    if (count === 0) end = days[i].date;
    start = days[i].date;
    count++;
    i--;
  }
  const current: Streak = count > 0 ? { length: count, start, end } : { length: 0 };

  return { current, longest };
}

export function buildActivity(
  counts: RawUserCounts,
  todayIso: string,
): ActivityData {
  const cal = counts.contributionsCollection.contributionCalendar;

  const weeks: ContributionDay[][] = cal.weeks.map((w) =>
    w.contributionDays
      // Drop days in the future (the current week is padded with them).
      .filter((d) => d.date <= todayIso)
      .map((d) => ({ date: d.date, count: d.contributionCount })),
  );

  const flat: ContributionDay[] = weeks.flat().sort((a, b) => a.date.localeCompare(b.date));
  const { current, longest } = computeStreaks(flat);
  const maxCount = flat.reduce((m, d) => Math.max(m, d.count), 0);

  return {
    totalContributions: cal.totalContributions,
    currentStreak: current,
    longestStreak: longest,
    weeks: weeks.filter((w) => w.length > 0),
    maxCount,
  };
}

/** Full pipeline: raw profile -> everything the three cards need. */
export function normalizeProfile(raw: RawProfile, config: Config): ProfileData {
  const generatedAt = new Date().toISOString();
  const todayIso = generatedAt.slice(0, 10);
  const repos = filterRepos(raw.repositories, config);

  return {
    stats: buildStats(raw.counts, repos),
    languages: aggregateLanguages(repos, config),
    activity: buildActivity(raw.counts, todayIso),
    generatedAt,
  };
}

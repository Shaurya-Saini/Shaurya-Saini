/** Deterministic mock GitHub data for offline preview + tests. */

import type { RawProfile } from "../src/github/client.js";
import type { RawContributionDay, RawRepository } from "../src/github/types.js";

// Tiny seeded PRNG so previews look the same every run.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildCalendarWeeks(rand: () => number): {
  contributionDays: RawContributionDay[];
}[] {
  const today = new Date();
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - 364);
  // Back up to the previous Sunday.
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());

  const weeks: { contributionDays: RawContributionDay[] }[] = [];
  const cursor = new Date(start);
  let week: RawContributionDay[] = [];

  while (cursor <= today) {
    const iso = cursor.toISOString().slice(0, 10);
    // Weekends quieter; occasional zero days to create realistic streaks.
    const weekend = cursor.getUTCDay() === 0 || cursor.getUTCDay() === 6;
    const roll = rand();
    let count = 0;
    if (roll > (weekend ? 0.55 : 0.25)) {
      count = Math.floor(rand() * (weekend ? 6 : 12)) + 1;
    }
    week.push({ date: iso, contributionCount: count });
    if (cursor.getUTCDay() === 6) {
      weeks.push({ contributionDays: week });
      week = [];
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  if (week.length) weeks.push({ contributionDays: week });
  return weeks;
}

export function mockRawProfile(username = "Shaurya-Saini"): RawProfile {
  const rand = mulberry32(42);
  const weeks = buildCalendarWeeks(rand);
  const total = weeks
    .flatMap((w) => w.contributionDays)
    .reduce((s, d) => s + d.contributionCount, 0);

  const repositories: RawRepository[] = [
    {
      name: "The-Master-Portfolio",
      isFork: false,
      isArchived: false,
      stargazerCount: 34,
      forkCount: 6,
      languages: {
        edges: [
          { size: 120000, node: { name: "TypeScript", color: "#3178c6" } },
          { size: 42000, node: { name: "CSS", color: "#563d7c" } },
          { size: 18000, node: { name: "HTML", color: "#e34c26" } },
        ],
      },
    },
    {
      name: "SCM",
      isFork: false,
      isArchived: false,
      stargazerCount: 21,
      forkCount: 3,
      languages: {
        edges: [
          { size: 95000, node: { name: "Python", color: "#3572A5" } },
          { size: 8000, node: { name: "Shell", color: "#89e051" } },
        ],
      },
    },
    {
      name: "cv-experiments",
      isFork: false,
      isArchived: false,
      stargazerCount: 9,
      forkCount: 1,
      languages: {
        edges: [
          { size: 60000, node: { name: "Python", color: "#3572A5" } },
          { size: 15000, node: { name: "Jupyter Notebook", color: "#DA5B0B" } },
        ],
      },
    },
    {
      name: "android-toolkit",
      isFork: false,
      isArchived: false,
      stargazerCount: 4,
      forkCount: 0,
      languages: {
        edges: [
          { size: 40000, node: { name: "Java", color: "#b07219" } },
          { size: 12000, node: { name: "Dart", color: "#00B4AB" } },
        ],
      },
    },
  ];

  return {
    counts: {
      name: "Shaurya Saini",
      login: username,
      followers: { totalCount: 128 },
      pullRequests: { totalCount: 73 },
      issues: { totalCount: 41 },
      contributionsCollection: {
        totalCommitContributions: Math.round(total * 0.72),
        totalPullRequestContributions: 73,
        totalPullRequestReviewContributions: 18,
        totalIssueContributions: 41,
        restrictedContributionsCount: 0,
        contributionCalendar: { totalContributions: total, weeks },
      },
    },
    repositories,
  };
}

import { describe, expect, it } from "vitest";
import {
  aggregateLanguages,
  buildActivity,
  computeStreaks,
} from "../src/github/normalize.js";
import { DEFAULT_CONFIG, type Config } from "../src/config.js";
import type { ContributionDay, RawRepository, RawUserCounts } from "../src/github/types.js";

const cfg = (over: Partial<Config["languages"]> = {}): Config => ({
  username: "u",
  excludeRepos: [],
  cache: DEFAULT_CONFIG.cache,
  languages: { ...DEFAULT_CONFIG.languages, ...over },
});

const days = (counts: number[], startIso = "2026-01-01"): ContributionDay[] => {
  const start = new Date(`${startIso}T00:00:00Z`);
  return counts.map((count, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return { date: d.toISOString().slice(0, 10), count };
  });
};

describe("computeStreaks", () => {
  it("finds current and longest when today is active", () => {
    const { current, longest } = computeStreaks(days([1, 1, 0, 1, 1, 1]));
    expect(current.length).toBe(3);
    expect(longest.length).toBe(3);
    expect(longest.end).toBe(current.end);
  });

  it("keeps the current streak alive when today has no contributions yet", () => {
    // last day (today) is 0 -> should still count the run ending yesterday.
    const { current } = computeStreaks(days([1, 1, 1, 0]));
    expect(current.length).toBe(3);
  });

  it("returns zero streaks for all-empty input", () => {
    const { current, longest } = computeStreaks(days([0, 0, 0]));
    expect(current.length).toBe(0);
    expect(longest.length).toBe(0);
  });
});

describe("aggregateLanguages", () => {
  const repos: RawRepository[] = [
    {
      name: "a",
      isFork: false,
      isArchived: false,
      stargazerCount: 0,
      forkCount: 0,
      languages: { edges: [{ size: 600, node: { name: "Python", color: "#1" } }] },
    },
    {
      name: "b",
      isFork: false,
      isArchived: false,
      stargazerCount: 0,
      forkCount: 0,
      languages: {
        edges: [
          { size: 300, node: { name: "Python", color: "#1" } },
          { size: 100, node: { name: "Shell", color: "#2" } },
        ],
      },
    },
  ];

  it("aggregates bytes across repos into percentages", () => {
    const out = aggregateLanguages(repos, cfg({ maxLanguages: 5 }));
    expect(out.totalBytes).toBe(1000);
    expect(out.languages[0]).toMatchObject({ name: "Python", percent: 90 });
    expect(out.languages[1]).toMatchObject({ name: "Shell", percent: 10 });
    expect(out.otherPercent).toBe(0);
  });

  it("caps at maxLanguages and reports the remainder as otherPercent", () => {
    const out = aggregateLanguages(repos, cfg({ maxLanguages: 1 }));
    expect(out.languages).toHaveLength(1);
    expect(out.otherPercent).toBe(10);
  });

  it("honours the hide list", () => {
    const out = aggregateLanguages(repos, cfg({ hide: ["shell"] }));
    expect(out.languages.map((l) => l.name)).not.toContain("Shell");
  });
});

describe("buildActivity", () => {
  it("drops future-padded days from the current week", () => {
    const counts = {
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: 3,
          weeks: [
            {
              contributionDays: [
                { date: "2026-08-13", contributionCount: 3 },
                { date: "2099-01-01", contributionCount: 0 },
              ],
            },
          ],
        },
      },
    } as unknown as RawUserCounts;
    const activity = buildActivity(counts, "2026-08-14");
    expect(activity.weeks[0]).toHaveLength(1);
    expect(activity.maxCount).toBe(3);
  });
});

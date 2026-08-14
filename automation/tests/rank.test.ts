import { describe, expect, it } from "vitest";
import { calculateRank } from "../src/generator/rank.js";
import type { StatsData } from "../src/github/types.js";

const stats = (over: Partial<StatsData>): StatsData => ({
  name: "U",
  login: "u",
  repositories: 0,
  stars: 0,
  forks: 0,
  followers: 0,
  pullRequests: 0,
  issues: 0,
  contributionsLastYear: 0,
  commitsLastYear: 0,
  reviewsLastYear: 0,
  ...over,
});

describe("calculateRank", () => {
  it("gives the worst grade for an empty profile", () => {
    const r = calculateRank(stats({}));
    expect(r.level).toBe("C");
    expect(r.percentile).toBeCloseTo(100, 0);
    expect(r.progress).toBe(0);
  });

  it("gives a top grade for a very strong profile", () => {
    const r = calculateRank(
      stats({
        commitsLastYear: 5000,
        pullRequests: 500,
        issues: 300,
        reviewsLastYear: 50,
        stars: 5000,
        followers: 2000,
      }),
    );
    expect(["S", "A+"]).toContain(r.level);
    expect(r.progress).toBeGreaterThan(90);
  });

  it("progress is the inverse of percentile", () => {
    const r = calculateRank(stats({ stars: 60, followers: 20, commitsLastYear: 900 }));
    // percentile is rounded to 1dp, so allow a small tolerance.
    expect(Math.abs(r.progress - (100 - r.percentile))).toBeLessThan(0.1);
  });
});

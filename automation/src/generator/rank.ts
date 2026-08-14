/**
 * GitHub rank ("S", "A+", ... "C") + percentile. This is a faithful port of the
 * algorithm github-readme-stats uses, so the grade on our card matches what
 * people are used to seeing. Lower percentile = better rank.
 *
 * Source of the model: exponential/log-normal CDFs over weighted contribution
 * signals, normalised to a 0..100 percentile.
 */

import type { StatsData } from "../github/types.js";

const MEDIAN = {
  commits: 1000,
  prs: 50,
  issues: 25,
  reviews: 2,
  stars: 50,
  followers: 10,
};

const WEIGHT = {
  commits: 2,
  prs: 3,
  issues: 1,
  reviews: 1,
  stars: 4,
  followers: 1,
};

const TOTAL_WEIGHT =
  WEIGHT.commits +
  WEIGHT.prs +
  WEIGHT.issues +
  WEIGHT.reviews +
  WEIGHT.stars +
  WEIGHT.followers;

const THRESHOLDS = [1, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100];
const LEVELS = ["S", "A+", "A", "A-", "B+", "B", "B-", "C+", "C"];

const exponentialCdf = (x: number): number => 1 - 2 ** -x;
const logNormalCdf = (x: number): number => x / (1 + x);

export interface Rank {
  /** Letter grade, e.g. "A+". */
  level: string;
  /** 0..100, lower is better. */
  percentile: number;
  /** Ring fill 0..100 (= 100 - percentile), higher looks fuller/better. */
  progress: number;
}

export function calculateRank(stats: StatsData): Rank {
  const rank =
    1 -
    (WEIGHT.commits * exponentialCdf(stats.commitsLastYear / MEDIAN.commits) +
      WEIGHT.prs * exponentialCdf(stats.pullRequests / MEDIAN.prs) +
      WEIGHT.issues * exponentialCdf(stats.issues / MEDIAN.issues) +
      WEIGHT.reviews * exponentialCdf(stats.reviewsLastYear / MEDIAN.reviews) +
      WEIGHT.stars * logNormalCdf(stats.stars / MEDIAN.stars) +
      WEIGHT.followers * logNormalCdf(stats.followers / MEDIAN.followers)) /
      TOTAL_WEIGHT;

  const percentile = rank * 100;
  const level = LEVELS[THRESHOLDS.findIndex((t) => percentile <= t)] ?? "C";

  return {
    level,
    percentile: Math.round(percentile * 10) / 10,
    progress: Math.max(0, Math.min(100, 100 - percentile)),
  };
}

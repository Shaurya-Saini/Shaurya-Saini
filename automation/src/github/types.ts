/** Raw shapes returned by the GitHub GraphQL API (only the fields we request). */

export interface RawLanguageEdge {
  size: number;
  node: { name: string; color: string | null };
}

export interface RawRepository {
  name: string;
  isFork: boolean;
  isArchived: boolean;
  stargazerCount: number;
  forkCount: number;
  languages: { edges: RawLanguageEdge[] };
}

export interface RawUserCounts {
  name: string | null;
  login: string;
  followers: { totalCount: number };
  pullRequests: { totalCount: number };
  issues: { totalCount: number };
  // Only the trailing-year commit + review counts, used for the rank grade.
  // The contribution calendar/total is NOT sourced here — see github/contributions.ts.
  contributionsCollection: {
    totalCommitContributions: number;
    totalPullRequestReviewContributions: number;
  };
}

/** ---- Normalized shapes consumed by the card generators ---- */

export interface StatsData {
  name: string;
  login: string;
  repositories: number;
  stars: number;
  forks: number;
  followers: number;
  pullRequests: number;
  issues: number;
  contributionsLastYear: number;
  /** Last-year commit + review counts, used only for the rank calculation. */
  commitsLastYear: number;
  reviewsLastYear: number;
}

export interface LanguageDatum {
  name: string;
  color: string;
  bytes: number;
  percent: number; // 0..100
}

export interface LanguagesData {
  languages: LanguageDatum[];
  totalBytes: number;
  /** Combined percentage of all languages outside the displayed top-N. */
  otherPercent: number;
}

export interface ContributionDay {
  date: string;
  count: number;
}

export interface Streak {
  length: number;
  start?: string;
  end?: string;
}

export interface ActivityData {
  totalContributions: number;
  currentStreak: Streak;
  longestStreak: Streak;
  /** Columns of the heatmap; each inner array is one week (top→bottom = Sun→Sat). */
  weeks: ContributionDay[][];
  maxCount: number;
}

export interface ProfileData {
  stats: StatsData;
  languages: LanguagesData;
  activity: ActivityData;
  generatedAt: string; // ISO timestamp
}

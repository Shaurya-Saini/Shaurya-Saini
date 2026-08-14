/**
 * Centralized configuration. Nothing behavioural should be hard-coded elsewhere —
 * import from here instead. Values that differ between deployments (username,
 * secrets) come from the Worker environment; see buildConfig().
 */

export interface LanguageConfig {
  /** Include repositories that are forks when aggregating language bytes. */
  includeForks: boolean;
  /** Include archived repositories. */
  includeArchived: boolean;
  /** Maximum number of languages to display on the card. */
  maxLanguages: number;
  /** Languages to always exclude (case-insensitive), e.g. generated markup. */
  hide: string[];
}

export interface CacheConfig {
  /** Seconds that browsers / GitHub's image proxy may cache a served SVG. */
  maxAge: number;
  /** Seconds a stale SVG may still be served while a fresh one is fetched. */
  staleWhileRevalidate: number;
}

export interface Config {
  username: string;
  /** Repositories (by name) to exclude from every card. */
  excludeRepos: string[];
  languages: LanguageConfig;
  cache: CacheConfig;
}

export const DEFAULT_CONFIG: Omit<Config, "username"> = {
  excludeRepos: [],
  languages: {
    includeForks: false,
    includeArchived: false,
    maxLanguages: 6,
    hide: [],
  },
  cache: {
    // 30 min browser cache; the underlying data only changes every 12h, but a
    // shorter value keeps GitHub's image proxy (camo) refreshing at a sane pace.
    maxAge: 1800,
    staleWhileRevalidate: 86400,
  },
};

/** KV keys under which the generated artifacts are stored. */
export const KV_KEYS = {
  stats: "card:stats.svg",
  languages: "card:languages.svg",
  activity: "card:activity.svg",
  meta: "meta:last-run.json",
} as const;

export interface Env {
  STATS_KV: KVNamespace;
  GITHUB_TOKEN: string;
  GITHUB_USERNAME?: string;
  /** Optional secret guarding the manual /refresh endpoint. */
  REFRESH_SECRET?: string;
}

/** Build the effective Config from the Worker environment + defaults. */
export function buildConfig(env: Env): Config {
  const username = (env.GITHUB_USERNAME || "").trim();
  if (!username) {
    throw new Error("GITHUB_USERNAME is not set (see wrangler.toml [vars]).");
  }
  return { username, ...DEFAULT_CONFIG };
}

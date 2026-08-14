/**
 * Thin GitHub GraphQL client with bounded retries + exponential backoff.
 *
 * Design notes:
 *  - Fetches nothing on a per-visitor basis; only the scheduled job calls this.
 *  - Fails FAST on auth/permission errors (4xx) — retrying won't help.
 *  - Retries transient failures (network, 5xx, secondary rate limits) a few times.
 *  - Never throws a partial result: callers get either a full dataset or an error,
 *    which is what lets us preserve the previous SVGs on failure.
 */

import { REPOSITORIES_QUERY, USER_COUNTS_QUERY } from "./queries.js";
import type { RawRepository, RawUserCounts } from "./types.js";

const GITHUB_GRAPHQL = "https://api.github.com/graphql";

export interface ClientOptions {
  token: string;
  /** Max attempts per request (default 4). */
  retries?: number;
  /** Base backoff in ms (default 500). */
  backoffMs?: number;
  /** Override endpoint (tests). */
  endpoint?: string;
  /** Injectable fetch (tests). */
  fetchImpl?: typeof fetch;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class GraphQLError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "GraphQLError";
  }
}

async function graphql<T>(
  query: string,
  variables: Record<string, unknown>,
  opts: ClientOptions,
): Promise<T> {
  const retries = opts.retries ?? 4;
  const backoffMs = opts.backoffMs ?? 500;
  const doFetch = opts.fetchImpl ?? fetch;
  const endpoint = opts.endpoint ?? GITHUB_GRAPHQL;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await doFetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${opts.token}`,
          "Content-Type": "application/json",
          "User-Agent": "github-profile-stats-worker",
        },
        body: JSON.stringify({ query, variables }),
      });

      // Auth / not-found: do not retry.
      if (res.status === 401 || res.status === 403) {
        // 403 can be a secondary rate limit (retryable) — distinguish via header.
        const retryAfter = res.headers.get("retry-after");
        if (res.status === 403 && retryAfter) {
          throw new GraphQLError(`Rate limited (retry-after ${retryAfter}s)`, true);
        }
        throw new GraphQLError(
          `Auth failed (HTTP ${res.status}). Check GITHUB_TOKEN scopes.`,
          false,
        );
      }
      if (res.status >= 500) {
        throw new GraphQLError(`GitHub server error (HTTP ${res.status})`, true);
      }
      if (!res.ok) {
        throw new GraphQLError(`Unexpected HTTP ${res.status}`, false);
      }

      const json = (await res.json()) as {
        data?: T;
        errors?: { message: string; type?: string }[];
      };

      if (json.errors && json.errors.length) {
        const msg = json.errors.map((e) => e.message).join("; ");
        // RATE_LIMITED type is retryable; schema/field errors are not.
        const retryable = json.errors.some((e) => e.type === "RATE_LIMITED");
        throw new GraphQLError(`GraphQL error: ${msg}`, retryable);
      }
      if (!json.data) {
        throw new GraphQLError("GraphQL response missing data", true);
      }
      return json.data;
    } catch (err) {
      lastErr = err;
      const retryable = err instanceof GraphQLError ? err.retryable : true;
      if (!retryable || attempt === retries) break;
      const wait = backoffMs * 2 ** (attempt - 1) + Math.floor(Math.random() * 250);
      console.warn(
        `[github] attempt ${attempt}/${retries} failed: ${(err as Error).message}. retrying in ${wait}ms`,
      );
      await sleep(wait);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export interface RawProfile {
  counts: RawUserCounts;
  repositories: RawRepository[];
}

/** Fetch everything needed for all three cards. Throws on unrecoverable failure. */
export async function fetchRawProfile(
  username: string,
  opts: ClientOptions,
): Promise<RawProfile> {
  const to = new Date();
  const from = new Date(to.getTime() - 365 * 24 * 60 * 60 * 1000);

  const countsData = await graphql<{ user: RawUserCounts | null }>(
    USER_COUNTS_QUERY,
    { login: username, from: from.toISOString(), to: to.toISOString() },
    opts,
  );
  if (!countsData.user) {
    throw new Error(`GitHub user "${username}" not found.`);
  }

  // Paginate repositories (handles users with >100 repos).
  const repositories: RawRepository[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 20; page++) {
    const data: { user: { repositories: RepoConnection } | null } = await graphql(
      REPOSITORIES_QUERY,
      { login: username, cursor },
      opts,
    );
    const conn = data.user?.repositories;
    if (!conn) break;
    repositories.push(...conn.nodes);
    if (!conn.pageInfo.hasNextPage) break;
    cursor = conn.pageInfo.endCursor;
  }

  return { counts: countsData.user, repositories };
}

interface RepoConnection {
  totalCount: number;
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  nodes: RawRepository[];
}

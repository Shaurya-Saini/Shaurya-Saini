/**
 * Fetches the PUBLIC contribution calendar fragment that GitHub's own profile
 * page uses:  https://github.com/users/<login>/contributions
 *
 * Why not the GraphQL API? `contributionsCollection` only exposes PUBLIC
 * contributions day-by-day; private-repo and "restricted" org contributions are
 * NOT available per day (a GitHub-staff-confirmed limitation — see
 * https://github.com/orgs/community/discussions/24812). This HTML fragment, by
 * contrast, mirrors exactly what the profile graph shows — including private/org
 * contributions when the user has enabled "Include private contributions on my
 * profile" — and needs no token. It is the same source github-readme-streak-stats
 * relies on.
 */

export interface ScrapedDay {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface ScrapedContributions {
  /** Authoritative total from the fragment header ("N contributions in the last year"). */
  totalContributions: number;
  /** Every day in the trailing ~year, ascending by date. */
  days: ScrapedDay[];
}

export interface FetchContribOptions {
  fetchImpl?: typeof fetch;
  /** Max attempts (default 4). */
  retries?: number;
  /** Base backoff in ms (default 500). */
  backoffMs?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchContributions(
  username: string,
  opts: FetchContribOptions = {},
): Promise<ScrapedContributions> {
  const doFetch = opts.fetchImpl ?? fetch;
  const retries = opts.retries ?? 4;
  const backoffMs = opts.backoffMs ?? 500;
  const url = `https://github.com/users/${encodeURIComponent(username)}/contributions`;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await doFetch(url, {
        headers: {
          "User-Agent": "github-profile-stats-worker",
          Accept: "text/html",
          "X-Requested-With": "XMLHttpRequest",
        },
      });
      if (res.status === 404) {
        // Not transient — stop immediately.
        throw new NonRetryable(`GitHub user "${username}" not found (contributions 404).`);
      }
      if (!res.ok) throw new Error(`Contributions page HTTP ${res.status}`);

      const html = await res.text();
      const parsed = parseContributions(html);
      if (!parsed.days.length) {
        throw new Error("Parsed 0 contribution days — GitHub markup may have changed.");
      }
      return parsed;
    } catch (err) {
      lastErr = err;
      if (err instanceof NonRetryable || attempt === retries) break;
      await sleep(backoffMs * 2 ** (attempt - 1) + Math.floor(Math.random() * 200));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

class NonRetryable extends Error {}

// --- Parsing (pure, unit-tested) -------------------------------------------

const CELL_RE = /<td\b[^>]*\bdata-date="[^"]*"[^>]*>/g;
const DATE_RE = /\bdata-date="(\d{4}-\d{2}-\d{2})"/;
const LEVEL_RE = /\bdata-level="(\d+)"/;
const ID_RE = /\bid="([^"]+)"/;
const DATA_COUNT_RE = /\bdata-count="(\d+)"/;
const ARIA_COUNT_RE = /\baria-label="([\d,]+)\s+contribution/i;
const TIP_RE = /<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>([\s\S]*?)<\/tool-tip>/g;
const TIP_COUNT_RE = /^\s*([\d,]+)\s+contribution/i;
const TOTAL_RE = /([\d,]+)\s+contributions?\s+in\s+the\s+last\s+year/i;

const toInt = (s: string): number => parseInt(s.replace(/,/g, ""), 10);

/**
 * Extract per-day counts + the yearly total from the fragment. Robust to the
 * several markups GitHub has shipped: the count is read from (in priority order)
 * a linked <tool-tip>, a data-count attribute, an aria-label, or — as a last
 * resort — the 0..4 data-level bucket. The total is read from the header, and
 * falls back to summing the days if the header text ever changes.
 */
export function parseContributions(html: string): ScrapedContributions {
  // Map each day cell's id -> exact count from its tooltip.
  const tipCounts = new Map<string, number>();
  for (const m of html.matchAll(TIP_RE)) {
    const cm = TIP_COUNT_RE.exec(m[2].trim());
    tipCounts.set(m[1], cm ? toInt(cm[1]) : 0); // "No contributions" -> 0
  }

  const days: ScrapedDay[] = [];
  for (const m of html.matchAll(CELL_RE)) {
    const tag = m[0];
    const date = DATE_RE.exec(tag)?.[1];
    if (!date) continue;

    const id = ID_RE.exec(tag)?.[1];
    const level = Number(LEVEL_RE.exec(tag)?.[1] ?? 0);

    let count: number | undefined = id ? tipCounts.get(id) : undefined;
    if (count === undefined) count = DATA_COUNT_RE.exec(tag) ? Number(DATA_COUNT_RE.exec(tag)![1]) : undefined;
    if (count === undefined) {
      const al = ARIA_COUNT_RE.exec(tag);
      count = al ? toInt(al[1]) : level > 0 ? level : 0;
    }
    days.push({ date, count });
  }

  days.sort((a, b) => a.date.localeCompare(b.date));

  const totalMatch = TOTAL_RE.exec(html);
  const total = totalMatch ? toInt(totalMatch[1]) : days.reduce((s, d) => s + d.count, 0);

  return { totalContributions: total, days };
}

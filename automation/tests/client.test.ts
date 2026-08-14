import { describe, expect, it, vi } from "vitest";
import { fetchRawProfile } from "../src/github/client.js";

const countsResponse = {
  data: {
    user: {
      name: "U",
      login: "u",
      followers: { totalCount: 1 },
      pullRequests: { totalCount: 2 },
      issues: { totalCount: 3 },
      contributionsCollection: {
        totalCommitContributions: 0,
        totalPullRequestContributions: 0,
        totalIssueContributions: 0,
        restrictedContributionsCount: 0,
        contributionCalendar: { totalContributions: 0, weeks: [] },
      },
    },
  },
};

const reposResponse = {
  data: {
    user: {
      repositories: {
        totalCount: 0,
        pageInfo: { hasNextPage: false, endCursor: null },
        nodes: [],
      },
    },
  },
};

const jsonRes = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers });

// A minimal contributions fragment: one day cell + its tooltip + the header.
const contribHtml = `<h2>5 contributions in the last year</h2>
<table><tbody><tr>
<td class="ContributionCalendar-day" data-date="2026-08-10" data-level="2" id="c-1"></td>
</tr></tbody></table>
<tool-tip for="c-1">5 contributions on August 10th.</tool-tip>`;
const htmlRes = (body: string, status = 200) =>
  new Response(body, { status, headers: { "Content-Type": "text/html" } });

const isContrib = (url: string | URL | Request) => String(url).includes("/contributions");

describe("fetchRawProfile", () => {
  it("fetches counts, repositories and contributions on the happy path", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      if (isContrib(url)) return htmlRes(contribHtml);
      const body = String(init?.body);
      return body.includes("UserCounts") ? jsonRes(countsResponse) : jsonRes(reposResponse);
    }) as unknown as typeof fetch;

    const profile = await fetchRawProfile("u", { token: "t", fetchImpl });
    expect(profile.counts.login).toBe("u");
    expect(profile.repositories).toHaveLength(0);
    expect(profile.contributions.totalContributions).toBe(5);
    expect(profile.contributions.days).toEqual([{ date: "2026-08-10", count: 5 }]);
  });

  it("does NOT retry on auth failure", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) =>
      isContrib(url) ? htmlRes(contribHtml) : jsonRes({}, 401),
    ) as unknown as typeof fetch;
    await expect(fetchRawProfile("u", { token: "bad", fetchImpl })).rejects.toThrow(/Auth failed/);
  });

  it("retries transient 5xx errors then succeeds", async () => {
    let n = 0;
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      if (isContrib(url)) return htmlRes(contribHtml);
      const body = String(init?.body);
      if (body.includes("UserCounts")) {
        n++;
        if (n === 1) return jsonRes({}, 500);
        return jsonRes(countsResponse);
      }
      return jsonRes(reposResponse);
    }) as unknown as typeof fetch;

    const profile = await fetchRawProfile("u", { token: "t", fetchImpl, backoffMs: 1 });
    expect(profile.counts.login).toBe("u");
    expect(n).toBe(2);
  });
});

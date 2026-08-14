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

describe("fetchRawProfile", () => {
  it("fetches counts then repositories on the happy path", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = String(init?.body);
      return body.includes("UserCounts") ? jsonRes(countsResponse) : jsonRes(reposResponse);
    }) as unknown as typeof fetch;

    const profile = await fetchRawProfile("u", { token: "t", fetchImpl });
    expect(profile.counts.login).toBe("u");
    expect(profile.repositories).toHaveLength(0);
  });

  it("does NOT retry on auth failure", async () => {
    const fetchImpl = vi.fn(async () => jsonRes({}, 401)) as unknown as typeof fetch;
    await expect(fetchRawProfile("u", { token: "bad", fetchImpl })).rejects.toThrow(/Auth failed/);
    expect((fetchImpl as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
  });

  it("retries transient 5xx errors then succeeds", async () => {
    let n = 0;
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
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

/**
 * Cloudflare Worker entrypoint.
 *
 *  fetch()     — serves the pre-generated SVGs from KV. Does NOT call GitHub on a
 *                normal request, which is what makes the cards reliable.
 *  scheduled() — the cron job: regenerate all cards and store them in KV. Runs on
 *                Cloudflare, so it never creates commits on your GitHub account.
 *
 * Failure policy: card keys in KV are only overwritten after a FULL successful
 * generation, so a failed run leaves the previous good SVGs untouched.
 */

import { buildConfig, KV_KEYS, type Env } from "./config.js";
import { generateCards } from "./pipeline.js";

const SVG_HEADERS = (maxAge: number, swr: number): HeadersInit => ({
  "Content-Type": "image/svg+xml; charset=utf-8",
  "Cache-Control": `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=${swr}`,
});

const ROUTE_TO_KEY: Record<string, string> = {
  "/stats.svg": KV_KEYS.stats,
  "/languages.svg": KV_KEYS.languages,
  "/activity.svg": KV_KEYS.activity,
};

function placeholderSvg(message: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="120" viewBox="0 0 500 120" role="img" aria-label="${message}">` +
    `<rect width="500" height="120" rx="10" fill="#282828" stroke="#3c3836"/>` +
    `<text x="250" y="64" fill="#A89984" font-size="14" text-anchor="middle" font-family="'Segoe UI',sans-serif">${message}</text>` +
    `</svg>`
  );
}

/** Regenerate all cards and persist them. Returns a status object. */
async function generateAndStore(
  env: Env,
): Promise<{ ok: boolean; generatedAt?: string; error?: string }> {
  const startedAt = new Date().toISOString();
  try {
    const config = buildConfig(env);
    if (!env.GITHUB_TOKEN) throw new Error("GITHUB_TOKEN secret is not set.");

    const { cards, profile } = await generateCards(env.GITHUB_TOKEN, config);

    // Only now — after everything succeeded — overwrite the served artifacts.
    await Promise.all([
      env.STATS_KV.put(KV_KEYS.stats, cards.stats),
      env.STATS_KV.put(KV_KEYS.languages, cards.languages),
      env.STATS_KV.put(KV_KEYS.activity, cards.activity),
      env.STATS_KV.put(
        KV_KEYS.meta,
        JSON.stringify({
          ok: true,
          generatedAt: profile.generatedAt,
          username: config.username,
          summary: {
            stars: profile.stats.stars,
            followers: profile.stats.followers,
            contributions: profile.activity.totalContributions,
          },
        }),
      ),
    ]);

    console.log(`[cron] generated cards for ${config.username} at ${profile.generatedAt}`);
    return { ok: true, generatedAt: profile.generatedAt };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[cron] generation FAILED (previous SVGs preserved): ${message}`);
    // Record the failure WITHOUT touching the card keys.
    try {
      await env.STATS_KV.put(
        KV_KEYS.meta,
        JSON.stringify({ ok: false, failedAt: startedAt, error: message }),
      );
    } catch {
      /* ignore meta write failure */
    }
    return { ok: false, error: message };
  }
}

async function serveCard(
  key: string,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const config = buildConfig(env);
  const svg = await env.STATS_KV.get(key);

  if (svg) {
    return new Response(svg, {
      headers: SVG_HEADERS(config.cache.maxAge, config.cache.staleWhileRevalidate),
    });
  }

  // Cold start: KV not primed yet. Kick off a generation and serve a placeholder
  // that browsers won't cache, so the real card appears on a later request.
  ctx.waitUntil(generateAndStore(env));
  return new Response(placeholderSvg("Warming up — check back shortly"), {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path in ROUTE_TO_KEY) {
      return serveCard(ROUTE_TO_KEY[path], env, ctx);
    }

    // Manual regeneration, guarded by a secret. Handy right after deploy.
    if (path === "/refresh") {
      if (!env.REFRESH_SECRET) {
        return json({ ok: false, error: "REFRESH_SECRET is not configured." }, 403);
      }
      const provided = url.searchParams.get("key") ?? request.headers.get("x-refresh-key");
      if (provided !== env.REFRESH_SECRET) {
        return json({ ok: false, error: "Unauthorized." }, 401);
      }
      const result = await generateAndStore(env);
      return json(result, result.ok ? 200 : 502);
    }

    if (path === "/" || path === "/health") {
      const meta = await env.STATS_KV.get(KV_KEYS.meta);
      return json(
        {
          service: "github-profile-stats",
          endpoints: ["/stats.svg", "/languages.svg", "/activity.svg"],
          lastRun: meta ? JSON.parse(meta) : null,
        },
        200,
      );
    }

    return json({ ok: false, error: "Not found." }, 404);
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(generateAndStore(env).then(() => undefined));
  },
};

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

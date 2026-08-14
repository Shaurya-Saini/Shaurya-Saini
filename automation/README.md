# GitHub Profile Stats

A scheduled **Cloudflare Worker** that fetches my GitHub data, renders three custom
**Gruvbox** SVG cards, and stores them in **Workers KV**. My README loads the SVGs
from stable Worker URLs.

It replaces `github-readme-stats` / `streak-stats`, which run on shared public
deployments that hit GitHub's rate limits and often fail to render. Here serving is
decoupled from GitHub — visitors read a pre-generated SVG from the edge, so it always
loads. The refresh job runs on Cloudflare, so it **never adds commits to my
contribution graph**.

| Endpoint | Card |
|---|---|
| `/stats.svg` | repositories, stars, forks, followers, PRs, issues, contributions, rank |
| `/languages.svg` | top languages by byte count + stacked bar |
| `/activity.svg` | contribution heatmap, total (1y), current & longest streak |

## Setup & deploy

Prerequisites: a [Cloudflare account](https://dash.cloudflare.com/sign-up) and a GitHub
personal access token (classic, scope `read:user`).

```bash
npm install
npx wrangler login                         # authenticate with Cloudflare

npx wrangler kv namespace create STATS_KV  # copy the printed id into wrangler.toml
npx wrangler secret put GITHUB_TOKEN       # paste your GitHub token
npx wrangler secret put REFRESH_SECRET     # any long random string

npx wrangler deploy                        # deploy the Worker
```

Set `GITHUB_USERNAME` in `wrangler.toml`. After deploying, prime the cards once
(the cron otherwise runs every 12h):

```bash
curl "https://<your-worker>.workers.dev/refresh?key=<REFRESH_SECRET>"
```

Then point your profile README at the three endpoints above.

> To include **private** contributions in the heatmap and commit counts, enable
> GitHub → Settings → Public profile → *Include private contributions on my profile*.

## Local development

```bash
npm run preview:mock   # render cards from mock data → preview/index.html
npm run preview        # render from real data (needs GITHUB_TOKEN in .dev.vars)
npm test               # vitest suite
npm run typecheck
npx wrangler dev        # run the Worker locally at http://localhost:8787
```

Copy `.dev.vars.example` → `.dev.vars` for local runs (git-ignored, never committed).

## Layout

```
src/
├── index.ts       # Worker entry (fetch serves from KV, scheduled regenerates)
├── config.ts      # username, language options, cache TTLs
├── pipeline.ts    # fetch → normalize → render
├── github/        # client, queries, types, normalize
└── generator/     # svg, icons, theme, stats, languages, activity, rank
```

/**
 * Local preview. Generates the three SVGs into ./preview and an index.html to
 * view them. Uses real GitHub data if a token is available, otherwise mock data.
 *
 *   npm run preview        # real data (needs GITHUB_TOKEN)
 *   npm run preview:mock   # mock data, no network
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { DEFAULT_CONFIG, type Config } from "../src/config.js";
import { normalizeProfile } from "../src/github/normalize.js";
import { renderCards } from "../src/generator/index.js";
import { generateCards } from "../src/pipeline.js";
import { mockRawProfile } from "./mock.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "preview");

/** Minimal .dev.vars loader (KEY="value" lines) for convenience. */
function loadDevVars(): Record<string, string> {
  const file = join(root, ".dev.vars");
  if (!existsSync(file)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

async function main() {
  const useMock = process.argv.includes("--mock");
  const devVars = loadDevVars();
  const username =
    process.env.GITHUB_USERNAME || devVars.GITHUB_USERNAME || "Shaurya-Saini";
  const config: Config = { username, ...DEFAULT_CONFIG };

  let cards;
  if (useMock) {
    console.log("Using MOCK data.");
    const profile = normalizeProfile(mockRawProfile(username), config);
    cards = renderCards(profile);
  } else {
    const token = process.env.GITHUB_TOKEN || devVars.GITHUB_TOKEN;
    if (!token) {
      console.error(
        "No GITHUB_TOKEN found. Set it in the environment or .dev.vars, " +
          "or run `npm run preview:mock` for offline preview.",
      );
      process.exit(1);
    }
    console.log(`Fetching real data for @${username} ...`);
    ({ cards } = await generateCards(token, config));
  }

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "stats.svg"), cards.stats);
  writeFileSync(join(outDir, "languages.svg"), cards.languages);
  writeFileSync(join(outDir, "activity.svg"), cards.activity);

  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>Profile cards preview</title>
<style>body{background:#1d2021;margin:0;padding:32px;font-family:'Segoe UI',sans-serif;color:#ebdbb2}
h1{font-size:16px;font-weight:600;color:#a89984}
.row{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start}
img{background:#282828;border-radius:10px}</style></head>
<body><h1>Preview (${useMock ? "mock" : "live"} data)</h1>
<div class="row">
<img src="stats.svg" alt="stats">
<img src="languages.svg" alt="languages">
<img src="activity.svg" alt="activity">
</div></body></html>`;
  writeFileSync(join(outDir, "index.html"), html);

  console.log(`\nWrote SVGs to ${outDir}`);
  console.log(`Open ${join(outDir, "index.html")} in a browser to view all three.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

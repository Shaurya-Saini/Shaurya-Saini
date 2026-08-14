/**
 * The generation pipeline shared by the Worker's cron handler and the local
 * preview script: fetch -> normalize -> render. No storage concerns here.
 */

import type { Config } from "./config.js";
import { fetchRawProfile, type ClientOptions } from "./github/client.js";
import { normalizeProfile } from "./github/normalize.js";
import type { ProfileData } from "./github/types.js";
import { renderCards, type RenderedCards } from "./generator/index.js";

export interface GenerateResult {
  cards: RenderedCards;
  profile: ProfileData;
}

export async function generateCards(
  token: string,
  config: Config,
  clientOpts: Partial<ClientOptions> = {},
): Promise<GenerateResult> {
  const raw = await fetchRawProfile(config.username, { token, ...clientOpts });
  const profile = normalizeProfile(raw, config);
  const cards = renderCards(profile);
  return { cards, profile };
}

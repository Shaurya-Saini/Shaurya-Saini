import { describe, expect, it } from "vitest";
import { normalizeProfile } from "../src/github/normalize.js";
import { renderCards } from "../src/generator/index.js";
import { escapeXml } from "../src/generator/svg.js";
import { DEFAULT_CONFIG, type Config } from "../src/config.js";
import { mockRawProfile } from "../scripts/mock.js";

const config: Config = { username: "Shaurya-Saini", ...DEFAULT_CONFIG };

describe("escapeXml", () => {
  it("escapes the five XML entities", () => {
    expect(escapeXml(`<a href="x" & 'y'>`)).toBe(
      "&lt;a href=&quot;x&quot; &amp; &apos;y&apos;&gt;",
    );
  });
});

describe("renderCards", () => {
  const profile = normalizeProfile(mockRawProfile("Shaurya-Saini"), config);
  const cards = renderCards(profile);

  it("produces three well-formed SVG documents", () => {
    for (const svg of Object.values(cards)) {
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
      // No unescaped ampersands that would break XML parsing.
      expect(/&(?!(amp|lt|gt|quot|apos);)/.test(svg)).toBe(false);
    }
  });

  it("includes expected labels/values", () => {
    expect(cards.stats).toContain("GitHub Stats");
    expect(cards.stats).toContain("Followers");
    expect(cards.languages).toContain("Most Used Languages");
    expect(cards.languages).toContain("Python");
    expect(cards.activity).toContain("Contribution Activity");
    expect(cards.activity).toContain("current streak");
  });
});

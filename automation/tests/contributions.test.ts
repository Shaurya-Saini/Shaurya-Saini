import { describe, expect, it } from "vitest";
import { parseContributions } from "../src/github/contributions.js";

describe("parseContributions", () => {
  it("reads the header total and per-day counts from tooltips", () => {
    const html = `
      <h2 class="f4 text-normal mb-2">245 contributions in the last year</h2>
      <table class="ContributionCalendar-grid"><tbody>
        <tr>
          <td class="ContributionCalendar-day" data-date="2025-09-20" data-level="0" id="a"></td>
          <td class="ContributionCalendar-day" data-date="2025-09-21" data-level="4" id="b"></td>
        </tr>
      </tbody></table>
      <tool-tip for="a">No contributions on September 20th.</tool-tip>
      <tool-tip for="b">27 contributions on September 21st.</tool-tip>`;

    const out = parseContributions(html);
    expect(out.totalContributions).toBe(245);
    expect(out.days).toEqual([
      { date: "2025-09-20", count: 0 },
      { date: "2025-09-21", count: 27 },
    ]);
  });

  it("handles comma-separated totals and sorts days ascending", () => {
    const html = `<h2>1,234 contributions in the last year</h2>
      <td class="ContributionCalendar-day" data-date="2025-12-31" data-level="1" id="y"></td>
      <td class="ContributionCalendar-day" data-date="2025-01-01" data-level="1" id="x"></td>
      <tool-tip for="x">2 contributions on January 1st.</tool-tip>
      <tool-tip for="y">3 contributions on December 31st.</tool-tip>`;
    const out = parseContributions(html);
    expect(out.totalContributions).toBe(1234);
    expect(out.days.map((d) => d.date)).toEqual(["2025-01-01", "2025-12-31"]);
  });

  it("falls back to the data-level bucket when no tooltip/count is present", () => {
    const html = `<h2>4 contributions in the last year</h2>
      <td class="ContributionCalendar-day" data-date="2025-06-01" data-level="3"></td>`;
    const out = parseContributions(html);
    // No tooltip/id/aria — count falls back to the level value (non-zero).
    expect(out.days).toEqual([{ date: "2025-06-01", count: 3 }]);
  });

  it("falls back to summing days when the header is missing", () => {
    const html = `
      <td class="ContributionCalendar-day" data-date="2025-06-01" data-level="1" id="p"></td>
      <td class="ContributionCalendar-day" data-date="2025-06-02" data-level="1" id="q"></td>
      <tool-tip for="p">2 contributions on June 1st.</tool-tip>
      <tool-tip for="q">5 contributions on June 2nd.</tool-tip>`;
    const out = parseContributions(html);
    expect(out.totalContributions).toBe(7);
  });
});

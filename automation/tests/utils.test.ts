import { describe, expect, it } from "vitest";
import { formatNumber, formatDate, round } from "../src/generator/utils.js";

describe("formatNumber", () => {
  it("leaves small numbers alone", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(999)).toBe("999");
  });
  it("abbreviates thousands and millions", () => {
    expect(formatNumber(1200)).toBe("1.2k");
    expect(formatNumber(1500000)).toBe("1.5m");
  });
  it("drops trailing .0 and rounds large mantissas", () => {
    expect(formatNumber(2000)).toBe("2k");
    expect(formatNumber(150000)).toBe("150k");
  });
});

describe("formatDate", () => {
  it("formats ISO dates", () => {
    expect(formatDate("2026-08-14")).toBe("Aug 14, 2026");
  });
});

describe("round", () => {
  it("rounds to given decimals", () => {
    expect(round(33.336, 1)).toBe(33.3);
    expect(round(50, 1)).toBe(50);
  });
});

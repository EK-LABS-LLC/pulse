import { describe, expect, it } from "bun:test";
import { calculateCost, hasPricing } from "../src/lib/pricing";

describe("calculateCost", () => {
  describe("known models - direct lookup", () => {
    it("calculates cost for gpt-4o", () => {
      const cost = calculateCost("gpt-4o", 1000, 500);
      expect(cost).toBe(0.75);
    });

    it("calculates cost for gpt-4o-mini", () => {
      const cost = calculateCost("gpt-4o-mini", 10000, 5000);
      expect(cost).toBeCloseTo(0.45, 10);
    });

    it("calculates cost for gpt-4-turbo", () => {
      const cost = calculateCost("gpt-4-turbo", 1000, 1000);
      expect(cost).toBe(4);
    });

    it("calculates cost for gpt-3.5-turbo", () => {
      const cost = calculateCost("gpt-3.5-turbo", 1_000_000, 1_000_000);
      expect(cost).toBe(200);
    });

    it("calculates cost for claude-3-5-sonnet-20241022", () => {
      const cost = calculateCost("claude-3-5-sonnet-20241022", 2000, 1000);
      expect(cost).toBe(2.1);
    });

    it("calculates cost for claude-3-5-haiku-20241022", () => {
      const cost = calculateCost("claude-3-5-haiku-20241022", 5000, 2500);
      expect(cost).toBe(1.4);
    });

    it("calculates cost for claude-3-opus-20240229", () => {
      const cost = calculateCost("claude-3-opus-20240229", 1000, 500);
      expect(cost).toBe(5.25);
    });

    it("calculates cost for claude-opus-4-5-20251101", () => {
      // $5 input + $25 output per 1M tokens
      const cost = calculateCost("claude-opus-4-5-20251101", 1000, 500);
      expect(cost).toBeCloseTo(1.75, 10);
    });

    it("calculates cost for claude-sonnet-4-20250514", () => {
      const cost = calculateCost("claude-sonnet-4-20250514", 1000, 500);
      expect(cost).toBeCloseTo(1.05, 10);
    });

    it("calculates cost for claude-3-7-sonnet-20250219", () => {
      const cost = calculateCost("claude-3-7-sonnet-20250219", 1000, 500);
      expect(cost).toBeCloseTo(1.05, 10);
    });

    it("calculates cost for claude-haiku-4-5-20251001", () => {
      const cost = calculateCost("claude-haiku-4-5-20251001", 1000, 500);
      expect(cost).toBeCloseTo(0.35, 10);
    });

    it("calculates cost for claude-3-haiku-20240307", () => {
      const cost = calculateCost("claude-3-haiku-20240307", 2000, 500);
      expect(cost).toBeCloseTo(0.1125, 10);
    });

    it("calculates cost for gpt-5.1", () => {
      // gpt-5.1: $1.25/1M input, $10/1M output
      // 2000 input + 1000 output => 0.25 + 1 = 1.25 cents
      const cost = calculateCost("gpt-5.1", 2000, 1000);
      expect(cost).toBeCloseTo(1.25, 10);
    });

    it("calculates cost for gpt-5-mini", () => {
      // gpt-5-mini: $0.90/1M input, $4/1M output
      // 10k input + 1k output => 0.9 + 0.4 = 1.3 cents
      const cost = calculateCost("gpt-5-mini", 10_000, 1000);
      expect(cost).toBeCloseTo(1.3, 10);
    });

    it("calculates cost for gpt-realtime", () => {
      // gpt-realtime: $5/1M input, $20/1M output
      // 1000 input + 500 output => 0.5 + 1 = 1.5 cents
      const cost = calculateCost("gpt-realtime", 1000, 500);
      expect(cost).toBeCloseTo(1.5, 10);
    });

    it("calculates cost for o1 reasoning model", () => {
      // o1: $15/1M input, $60/1M output
      // 500 input + 250 output => 0.75 + 1.5 = 2.25 cents
      const cost = calculateCost("o1", 500, 250);
      expect(cost).toBeCloseTo(2.25, 10);
    });

    it("calculates cost for gpt-5-search-api", () => {
      // $4/1M input, $16/1M output
      // 200 input + 100 output => 0.08 + 0.16 = 0.24 cents
      const cost = calculateCost("gpt-5-search-api", 200, 100);
      expect(cost).toBeCloseTo(0.24, 10);
    });

    it("calculates cost for gpt-image-1 with output ignored", () => {
      // gpt-image-1: $50/1M input, no output charge
      // 1000 input => 5 cents
      const cost = calculateCost("gpt-image-1", 1000, 500);
      expect(cost).toBe(5);
    });
  });

  describe("known models - alias lookup", () => {
    it("calculates cost using gpt-4o date alias", () => {
      const cost = calculateCost("gpt-4o-2024-11-20", 1000, 500);
      expect(cost).toBe(0.75);
    });

    it("calculates cost using gpt-4o-mini date alias", () => {
      const cost = calculateCost("gpt-4o-mini-2024-07-18", 10000, 5000);
      expect(cost).toBeCloseTo(0.45, 10);
    });

    it("calculates cost using claude short name alias", () => {
      const cost = calculateCost("claude-3-5-sonnet", 2000, 1000);
      expect(cost).toBe(2.1);
    });

    it("calculates cost using claude dot notation alias", () => {
      const cost = calculateCost("claude-3.5-sonnet", 2000, 1000);
      expect(cost).toBe(2.1);
    });

    it("calculates cost using claude-3-opus short alias", () => {
      const cost = calculateCost("claude-3-opus", 1000, 500);
      expect(cost).toBe(5.25);
    });

    it("calculates cost using gpt-4.1 latest alias", () => {
      const cost = calculateCost("gpt-4.1-latest", 1000, 1000);
      expect(cost).toBeCloseTo(1.25, 10);
    });

    it("calculates cost using claude-opus-4-5 alias", () => {
      const cost = calculateCost("claude-opus-4-5", 1000, 500);
      expect(cost).toBeCloseTo(1.75, 10);
    });
  });

  describe("unknown models", () => {
    it("returns null for unknown model", () => {
      expect(calculateCost("unknown-model-xyz", 1000, 500)).toBeNull();
    });

    it("returns null for empty model string", () => {
      expect(calculateCost("", 1000, 500)).toBeNull();
    });

    it("returns null for model with typo", () => {
      expect(calculateCost("gpt-4o-mni", 1000, 500)).toBeNull();
    });

    it("returns null for non-existent provider", () => {
      expect(calculateCost("azure-gpt-4", 1000, 500)).toBeNull();
    });
  });

  describe("edge cases - zero tokens", () => {
    it("returns 0 for zero input and output tokens", () => {
      expect(calculateCost("gpt-4o", 0, 0)).toBe(0);
    });

    it("returns correct cost for zero input tokens only", () => {
      expect(calculateCost("gpt-4o", 0, 1000)).toBe(1);
    });

    it("returns correct cost for zero output tokens only", () => {
      expect(calculateCost("gpt-4o", 1000, 0)).toBe(0.25);
    });
  });

  describe("edge cases - large numbers", () => {
    it("calculates cost for 1 million input tokens", () => {
      expect(calculateCost("gpt-4o", 1_000_000, 0)).toBe(250);
    });

    it("calculates cost for 1 million output tokens", () => {
      expect(calculateCost("gpt-4o", 0, 1_000_000)).toBe(1000);
    });

    it("calculates cost for very large token counts", () => {
      expect(calculateCost("gpt-4o", 10_000_000, 5_000_000)).toBe(7500);
    });

    it("handles precision for small token counts", () => {
      const cost = calculateCost("gpt-4o-mini", 1, 1);
      expect(cost).toBeCloseTo(0.000075, 10);
    });
  });
});

describe("hasPricing", () => {
  it("returns true for known model", () => {
    expect(hasPricing("gpt-4o")).toBe(true);
    expect(hasPricing("claude-3-5-sonnet-20241022")).toBe(true);
    expect(hasPricing("gpt-5.1")).toBe(true);
    expect(hasPricing("claude-opus-4-5-20251101")).toBe(true);
  });

  it("returns true for aliased model", () => {
    expect(hasPricing("gpt-4o-2024-11-20")).toBe(true);
    expect(hasPricing("claude-3-5-sonnet")).toBe(true);
    expect(hasPricing("gpt-4.1-latest")).toBe(true);
    expect(hasPricing("claude-opus-4-5")).toBe(true);
  });

  it("returns false for unknown model", () => {
    expect(hasPricing("unknown-model")).toBe(false);
    expect(hasPricing("")).toBe(false);
  });
});

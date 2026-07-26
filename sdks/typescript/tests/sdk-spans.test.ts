import { describe, expect, it } from "bun:test";
import { compactPayload } from "../src/providers/sdk-spans";

describe("compactPayload", () => {
  it("caps multibyte previews by UTF-8 byte length", () => {
    const compacted = compactPayload("😀".repeat(20_000)) as {
      truncated: boolean;
      originalBytes: number;
      preview: string;
    };

    expect(compacted.truncated).toBe(true);
    expect(compacted.originalBytes).toBe(80_000);
    expect(new TextEncoder().encode(compacted.preview).byteLength).toBeLessThanOrEqual(64 * 1024);
    expect(compacted.preview.endsWith("�")).toBe(false);
  });
});

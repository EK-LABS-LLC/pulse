import { beforeEach, describe, expect, test } from "bun:test";
import {
  getTraceUiPrefs,
  setTraceUiPref,
  TRACE_UI_PREF_KEYS,
} from "./traceUiPrefs.ts";

const values = new Map();

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  },
});

describe("trace UI preferences", () => {
  beforeEach(() => values.clear());

  test("uses the redesign defaults when storage is empty", () => {
    expect(getTraceUiPrefs()).toEqual({
      rowDensity: "rich",
      statsMode: "trend",
      ioFormat: "chat",
    });
  });

  test("persists and reads valid preferences", () => {
    setTraceUiPref("rowDensity", "minimal");
    setTraceUiPref("statsMode", "compact");
    setTraceUiPref("ioFormat", "json");

    expect(values.get(TRACE_UI_PREF_KEYS.rowDensity)).toBe("minimal");
    expect(getTraceUiPrefs()).toEqual({
      rowDensity: "minimal",
      statsMode: "compact",
      ioFormat: "json",
    });
  });

  test("ignores invalid stored values", () => {
    values.set(TRACE_UI_PREF_KEYS.rowDensity, "dense");
    values.set(TRACE_UI_PREF_KEYS.statsMode, "chart");
    values.set(TRACE_UI_PREF_KEYS.ioFormat, "xml");

    expect(getTraceUiPrefs()).toEqual({
      rowDensity: "rich",
      statsMode: "trend",
      ioFormat: "chat",
    });
  });
});

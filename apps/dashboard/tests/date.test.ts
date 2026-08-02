import { describe, expect, test } from "bun:test";
import {
  formatLocalDateKey,
  getCustomDateWindow,
  getDateWindow,
  parseLocalDateKey,
} from "../src/lib/date";

describe("Dashboard dates", () => {
  test("round-trips a local calendar date without a UTC shift", () => {
    const date = parseLocalDateKey("2026-08-02");

    expect(formatLocalDateKey(date)).toBe("2026-08-02");
  });

  test("uses the current time when the selected ending date is today", () => {
    const now = new Date(2026, 7, 2, 15, 30, 0);
    const window = getDateWindow("24h", "2026-08-02", now);

    expect(window.date_to).toBe(now.toISOString());
    expect(
      new Date(window.date_to).getTime() - new Date(window.date_from).getTime(),
    ).toBe(24 * 60 * 60 * 1000);
  });

  test("uses the end of a selected historical date", () => {
    const now = new Date(2026, 7, 2, 15, 30, 0);
    const window = getDateWindow("7d", "2026-07-15", now);
    const endingDate = new Date(window.date_to);

    expect(endingDate.getFullYear()).toBe(2026);
    expect(endingDate.getMonth()).toBe(6);
    expect(endingDate.getDate()).toBe(15);
    expect(endingDate.getHours()).toBe(23);
    expect(endingDate.getMinutes()).toBe(59);
    expect(endingDate.getTime() - new Date(window.date_from).getTime()).toBe(
      7 * 24 * 60 * 60 * 1000,
    );
  });

  test("uses inclusive local-day boundaries for a custom range", () => {
    const now = new Date(2026, 7, 20, 15, 30, 0);
    const window = getCustomDateWindow("2026-07-10", "2026-07-15", now);
    const from = new Date(window.date_from);
    const to = new Date(window.date_to);

    expect(from.getDate()).toBe(10);
    expect(from.getHours()).toBe(0);
    expect(to.getDate()).toBe(15);
    expect(to.getHours()).toBe(23);
    expect(to.getMinutes()).toBe(59);
  });
});

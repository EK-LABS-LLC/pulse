export type DateWindowRange = "24h" | "7d" | "30d";

const RANGE_DURATION_MS: Record<DateWindowRange, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

export function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDateKey(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

export function getDateWindow(
  range: DateWindowRange,
  endingDate: string,
  now = new Date(),
): { date_from: string; date_to: string } {
  const to =
    endingDate === formatLocalDateKey(now)
      ? now
      : (() => {
          const selected = parseLocalDateKey(endingDate);
          selected.setHours(23, 59, 59, 999);
          return selected;
        })();
  const from = new Date(to.getTime() - RANGE_DURATION_MS[range]);

  return { date_from: from.toISOString(), date_to: to.toISOString() };
}

export function getCustomDateWindow(
  fromDate: string,
  toDate: string,
  now = new Date(),
): { date_from: string; date_to: string } {
  const from = parseLocalDateKey(fromDate);
  from.setHours(0, 0, 0, 0);

  const to =
    toDate === formatLocalDateKey(now)
      ? now
      : (() => {
          const selected = parseLocalDateKey(toDate);
          selected.setHours(23, 59, 59, 999);
          return selected;
        })();

  return { date_from: from.toISOString(), date_to: to.toISOString() };
}

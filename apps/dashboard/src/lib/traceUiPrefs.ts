export type TraceRowDensity = "rich" | "minimal";
export type TraceStatsMode = "trend" | "compact";
export type TraceIoFormat = "chat" | "json";

export interface TraceUiPrefs {
  rowDensity: TraceRowDensity;
  statsMode: TraceStatsMode;
  ioFormat: TraceIoFormat;
}

export const TRACE_UI_PREF_KEYS = {
  rowDensity: "pulse.trace.rowDensity",
  statsMode: "pulse.trace.statsMode",
  ioFormat: "pulse.trace.ioFormat",
} as const;

export const TRACE_UI_PREFS_EVENT = "pulse:trace-ui-prefs-change";

const DEFAULT_PREFS: TraceUiPrefs = {
  rowDensity: "rich",
  statsMode: "trend",
  ioFormat: "chat",
};

const VALID_VALUES = {
  rowDensity: ["rich", "minimal"],
  statsMode: ["trend", "compact"],
  ioFormat: ["chat", "json"],
} as const;

function readPreference<K extends keyof TraceUiPrefs>(
  preference: K,
): TraceUiPrefs[K] {
  try {
    const stored = localStorage.getItem(TRACE_UI_PREF_KEYS[preference]);
    return (VALID_VALUES[preference] as readonly string[]).includes(
      stored ?? "",
    )
      ? (stored as TraceUiPrefs[K])
      : DEFAULT_PREFS[preference];
  } catch {
    return DEFAULT_PREFS[preference];
  }
}

export function getTraceUiPrefs(): TraceUiPrefs {
  return {
    rowDensity: readPreference("rowDensity"),
    statsMode: readPreference("statsMode"),
    ioFormat: readPreference("ioFormat"),
  };
}

export function setTraceUiPref<K extends keyof TraceUiPrefs>(
  preference: K,
  value: TraceUiPrefs[K],
): void {
  try {
    localStorage.setItem(TRACE_UI_PREF_KEYS[preference], value);
  } catch {
    // The preference still applies in component state for this session.
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TRACE_UI_PREFS_EVENT));
  }
}

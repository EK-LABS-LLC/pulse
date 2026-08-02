import { useEffect, useState } from "react";
import { SegmentedControl } from "../ui/SegmentedControl";
import {
  getTraceUiPrefs,
  setTraceUiPref,
  TRACE_UI_PREFS_EVENT,
  type TraceIoFormat,
  type TraceRowDensity,
  type TraceStatsMode,
} from "../../lib/traceUiPrefs";

export default function TraceDefaultsSettings() {
  const [prefs, setPrefs] = useState(getTraceUiPrefs);

  useEffect(() => {
    const sync = () => setPrefs(getTraceUiPrefs());
    window.addEventListener("storage", sync);
    window.addEventListener(TRACE_UI_PREFS_EVENT, sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(TRACE_UI_PREFS_EVENT, sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const updatePreference = <K extends "rowDensity" | "statsMode" | "ioFormat">(
    preference: K,
    value: {
      rowDensity: TraceRowDensity;
      statsMode: TraceStatsMode;
      ioFormat: TraceIoFormat;
    }[K],
  ) => {
    setPrefs((current) => ({ ...current, [preference]: value }));
    setTraceUiPref(preference, value);
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold tracking-[-0.015em] text-fg">
        Trace defaults
      </h2>
      <p className="mt-0.5 mb-4 text-xs text-dim">
        Defaults for the traces list and detail panel.
      </p>

      <div className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] text-fg-2">Row density</span>
          <SegmentedControl
            ariaLabel="Trace row density"
            value={prefs.rowDensity}
            onChange={(value) => updatePreference("rowDensity", value)}
            options={[
              { value: "rich", label: "Rich" },
              { value: "minimal", label: "Minimal" },
            ]}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] text-fg-2">Overview stats</span>
          <SegmentedControl
            ariaLabel="Overview stats display"
            value={prefs.statsMode}
            onChange={(value) => updatePreference("statsMode", value)}
            options={[
              { value: "trend", label: "Trend" },
              { value: "compact", label: "Compact" },
            ]}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] text-fg-2">
            Request / response format
          </span>
          <SegmentedControl
            ariaLabel="Request and response format"
            value={prefs.ioFormat}
            onChange={(value) => updatePreference("ioFormat", value)}
            options={[
              { value: "chat", label: "Chat" },
              { value: "json", label: "JSON" },
            ]}
          />
        </div>
      </div>
    </section>
  );
}

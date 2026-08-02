import { useState } from "react";
import type { Span } from "../../lib/apiClient";
import { SegmentedControl } from "../ui/SegmentedControl";
import { StatusDot } from "../ui/StatusDot";
import { JsonBlock } from "./JsonBlock";
import { fmtAbs, fmtLatency } from "../../lib/format";
import { spanLabel } from "../../lib/spanRows";

type Side = "input" | "output";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px]" style={{ color: "var(--dim)" }}>
        {label}
      </span>
      <span className="truncate text-sm" style={{ color: "var(--text-2)" }}>
        {value}
      </span>
    </div>
  );
}

export function SpanDetailPanel({ span }: { span: Span | null }) {
  const [side, setSide] = useState<Side>("input");

  if (!span) {
    return (
      <div
        className="flex h-full items-center justify-center rounded-xl p-6 text-sm"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-soft)",
          color: "var(--dim)",
        }}
      >
        Select a span to inspect it.
      </div>
    );
  }

  const isError = span.status === "error";
  const payload =
    side === "input"
      ? (span.toolInput ?? span.metadata)
      : isError
        ? span.error
        : span.toolResponse;

  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-xl"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-soft)",
        animation: "panelIn .18s ease-out",
      }}
    >
      <div
        className="flex flex-col gap-3 px-4 py-3"
        style={{ borderBottom: "1px solid var(--border-soft)" }}
      >
        <div className="flex items-center gap-2">
          <StatusDot status={span.status} />
          <span
            className="truncate text-sm font-medium"
            style={{ color: "var(--text)" }}
          >
            {spanLabel(span)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Kind" value={span.kind} />
          <Field label="Duration" value={fmtLatency(span.durationMs)} />
          <Field label="Service" value={span.service ?? "—"} />
          <Field label="Started" value={fmtAbs(span.timestamp)} />
        </div>

        {isError && span.error != null && (
          <div
            className="rounded-lg px-3 py-2 text-xs"
            style={{
              background: "var(--red-tint)",
              border: "1px solid var(--red-border)",
              color: "var(--red-text)",
            }}
          >
            {typeof span.error === "string"
              ? span.error
              : ((span.error as { message?: string })?.message ??
                "This span failed.")}
          </div>
        )}
      </div>

      <div className="px-4 py-3">
        <SegmentedControl
          ariaLabel="Span payload"
          value={side}
          onChange={setSide}
          options={[
            { value: "input", label: "Input" },
            { value: "output", label: isError ? "Error" : "Output" },
          ]}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
        <JsonBlock value={payload} />
      </div>
    </div>
  );
}

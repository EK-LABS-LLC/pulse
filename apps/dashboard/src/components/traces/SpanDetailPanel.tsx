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
      className="overflow-hidden rounded-2xl"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        animation: "panelIn .18s ease-out",
      }}
    >
      <div
        className="flex items-center justify-between gap-3 px-5 py-4"
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
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase"
          style={{
            background: isError ? "var(--red-tint-2)" : "var(--green-tint)",
            color: isError ? "var(--red)" : "var(--green)",
          }}
        >
          {isError ? "Error" : "OK"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 px-5 py-4 sm:grid-cols-4">
        <Field label="Kind" value={span.kind.replaceAll("_", " ")} />
        <Field label="Duration" value={fmtLatency(span.durationMs)} />
        <Field label="Service" value={span.service ?? "—"} />
        <Field label="Started" value={fmtAbs(span.timestamp)} />
      </div>

      {isError && span.error != null ? (
        <div
          className="mx-5 mb-4 rounded-xl px-3 py-2.5 font-mono text-xs"
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
      ) : null}

      <div className="border-t border-line-soft px-5 py-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-[11.5px] font-semibold text-fg-3">
            Span payload
          </span>
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
        <JsonBlock value={payload} maxHeight="260px" />
      </div>
    </div>
  );
}

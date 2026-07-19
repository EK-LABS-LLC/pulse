import type { OtlpSpanAttribute, OtlpTracesPayload, Span } from "../types";

/**
 * Send buffered SDK spans to the Pulse OTLP-compatible traces endpoint.
 */
export async function sendSpans(apiUrl: string, apiKey: string, spans: Span[]): Promise<void> {
  if (spans.length === 0) {
    return;
  }

  const url = `${apiUrl}/v1/traces`;
  const body = JSON.stringify(toOtlpPayload(spans));

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(`Pulse SDK: failed to send spans (${response.status}): ${errorText}`);
    }
  } catch (error) {
    console.error("Pulse SDK: network error sending spans:", error);
  }
}

export function toOtlpPayload(spans: Span[]): OtlpTracesPayload {
  return {
    resourceSpans: [
      {
        resource: {
          attributes: [{ key: "service.name", value: { stringValue: "pulse-sdk" } }],
        },
        scopeSpans: [
          {
            scope: { name: "@eklabs/pulse-sdk" },
            spans: spans.map(toOtlpSpan),
          },
        ],
      },
    ],
  };
}

function toOtlpSpan(span: Span): OtlpTracesPayload["resourceSpans"][number]["scopeSpans"][number]["spans"][number] {
  const startNs = BigInt(new Date(span.timestamp).getTime()) * 1_000_000n;
  const durationNs = BigInt(Math.max(0, span.duration_ms ?? 0)) * 1_000_000n;
  const attributes: OtlpSpanAttribute[] = [
    stringAttr("pulse.source", span.source),
    stringAttr("pulse.kind", span.kind),
    stringAttr("pulse.event_type", span.event_type),
    stringAttr("pulse.session_id", span.session_id),
    stringAttr("pulse.trace_id", span.trace_id),
  ];

  if (span.model) attributes.push(stringAttr("gen_ai.request.model", span.model));
  if (span.provider) attributes.push(stringAttr("gen_ai.provider.name", span.provider));
  if (span.model_used) attributes.push(stringAttr("gen_ai.response.model", span.model_used));
  if (span.provider_request_id) {
    attributes.push(stringAttr("gen_ai.response.id", span.provider_request_id));
  }
  if (span.finish_reason) {
    attributes.push(stringAttr("gen_ai.response.finish_reasons", JSON.stringify([span.finish_reason])));
  }
  if (span.input_tokens !== undefined) {
    attributes.push({ key: "gen_ai.usage.input_tokens", value: { intValue: String(span.input_tokens) } });
  }
  if (span.output_tokens !== undefined) {
    attributes.push({ key: "gen_ai.usage.output_tokens", value: { intValue: String(span.output_tokens) } });
  }
  if (span.cost_cents !== undefined) {
    attributes.push({ key: "pulse.cost_cents", value: { doubleValue: span.cost_cents } });
  }
  if (span.output_text !== undefined) {
    attributes.push(stringAttr("pulse.output_text", span.output_text));
  }
  if (span.tool_use_id) attributes.push(stringAttr("pulse.tool.id", span.tool_use_id));
  if (span.tool_name) {
    attributes.push(stringAttr("pulse.tool.name", span.tool_name));
    attributes.push(stringAttr("gen_ai.tool.name", span.tool_name));
  }
  if (span.tool_input !== undefined) {
    attributes.push(stringAttr("pulse.tool.input", JSON.stringify(span.tool_input)));
    attributes.push(stringAttr("gen_ai.tool.input", JSON.stringify(span.tool_input)));
  }
  if (span.tool_response !== undefined) {
    attributes.push(stringAttr("pulse.tool.response", JSON.stringify(span.tool_response)));
    attributes.push(stringAttr("gen_ai.tool.output", JSON.stringify(span.tool_response)));
  }
  if (span.error !== undefined) attributes.push(stringAttr("pulse.error", JSON.stringify(span.error)));
  if (span.metadata) {
    for (const [key, value] of Object.entries(span.metadata)) {
      attributes.push(
        stringAttr(`pulse.metadata.${key}`, typeof value === "string" ? value : JSON.stringify(value)),
      );
    }
  }

  return {
    traceId: span.trace_id,
    spanId: span.span_id,
    parentSpanId: span.parent_span_id,
    name: span.tool_name ?? span.event_type,
    startTimeUnixNano: startNs.toString(),
    endTimeUnixNano: (startNs + durationNs).toString(),
    attributes,
    status: spanStatus(span),
  };
}

function spanStatus(span: Span): { code: number; message?: string } {
  if (span.status !== "error") {
    return { code: 1 };
  }
  const error = span.error as Record<string, unknown> | undefined;
  const message = error && typeof error.message === "string" ? error.message : undefined;
  return message ? { code: 2, message } : { code: 2 };
}

function stringAttr(key: string, value: string): OtlpSpanAttribute {
  return { key, value: { stringValue: value } };
}

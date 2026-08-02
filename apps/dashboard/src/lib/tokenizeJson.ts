export interface JsonToken {
  text: string;
  color: string;
  key: number;
}

const PUNCTUATION = "var(--dim)";

const TOKEN_PATTERN =
  /("(?:\\.|[^"\\])*"(\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}[\],])/g;

function colorFor(value: string): string {
  if (value.startsWith('"')) {
    return /:\s*$/.test(value) ? "var(--json-key)" : "var(--json-str)";
  }
  if (value === "true" || value === "false") return "var(--json-bool)";
  if (value === "null") return "var(--faint)";
  if (/^-?\d/.test(value)) return "var(--text)";
  return PUNCTUATION;
}

/**
 * Splits a value's pretty-printed JSON into coloured spans. Colours are CSS
 * variables rather than resolved hex so the output follows a theme change
 * without re-tokenizing.
 */
export function tokenizeJson(value: unknown): JsonToken[] {
  if (value === undefined) {
    return [{ text: "No data available.", color: "var(--dim)", key: 0 }];
  }

  let source: string;
  try {
    source = JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    // Cyclic structures reach here; show them rather than crashing the panel.
    return [
      { text: "Value could not be serialized.", color: "var(--dim)", key: 0 },
    ];
  }

  const tokens: JsonToken[] = [];
  let last = 0;
  let index = 0;
  let match: RegExpExecArray | null;

  TOKEN_PATTERN.lastIndex = 0;
  while ((match = TOKEN_PATTERN.exec(source))) {
    if (match.index > last) {
      tokens.push({
        text: source.slice(last, match.index),
        color: PUNCTUATION,
        key: index++,
      });
    }
    tokens.push({ text: match[0], color: colorFor(match[0]), key: index++ });
    last = TOKEN_PATTERN.lastIndex;
  }
  if (last < source.length) {
    tokens.push({ text: source.slice(last), color: PUNCTUATION, key: index++ });
  }
  return tokens;
}

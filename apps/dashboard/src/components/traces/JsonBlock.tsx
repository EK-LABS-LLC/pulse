import { tokenizeJson } from "../../lib/tokenizeJson";

export function JsonBlock({
  value,
  maxHeight,
}: {
  value: unknown;
  maxHeight?: string;
}) {
  const tokens = tokenizeJson(value);

  return (
    <pre
      className="overflow-auto rounded-lg p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap"
      style={{
        background: "var(--surface-3)",
        border: "1px solid var(--border-soft)",
        margin: 0,
        maxHeight,
      }}
    >
      {tokens.map((token) => (
        <span key={token.key} style={{ color: token.color }}>
          {token.text}
        </span>
      ))}
    </pre>
  );
}

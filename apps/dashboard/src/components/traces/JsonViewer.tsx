import { useState } from "react";
import { tokenizeJson } from "../../lib/tokenizeJson";

interface JsonViewerProps {
  data: unknown;
  title: string;
}

const CopyIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  </svg>
);

const CheckIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M5 13l4 4L19 7"
    />
  </svg>
);

const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5l7 7-7 7"
    />
  </svg>
);

export default function JsonViewer({ data, title }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const tokens = tokenizeJson(data);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2) ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-soft)",
        height: collapsed ? "auto" : "400px",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--border-soft)" }}
      >
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex cursor-pointer items-center gap-2 border-0 bg-transparent text-xs tracking-wide uppercase transition-colors"
          style={{ color: "var(--dim)" }}
        >
          <ChevronIcon expanded={!collapsed} />
          {title}
        </button>
        <button
          onClick={handleCopy}
          className="flex cursor-pointer items-center gap-1.5 border-0 bg-transparent text-xs transition-colors"
          style={{ color: copied ? "var(--green)" : "var(--dim)" }}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      {!collapsed && (
        <pre
          className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap"
          style={{ margin: 0 }}
        >
          {tokens.map((token) => (
            <span key={token.key} style={{ color: token.color }}>
              {token.text}
            </span>
          ))}
        </pre>
      )}
    </div>
  );
}

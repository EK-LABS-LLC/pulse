import { useState } from "react";

interface ApiKeyCardProps {
  id: string;
  name: string;
  keyValue: string;
  createdAt: string;
  lastUsedAt?: string;
  status: "active" | "never_used";
  isNew?: boolean;
  onCopy: (keyValue: string) => void | Promise<void>;
  onRevoke: (id: string) => void | Promise<void>;
  onNameChange?: (id: string, newName: string) => void;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatLastUsed(dateString?: string): string {
  if (!dateString) return "Never used";
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);
  if (minutes < 1) return "Last used just now";
  if (minutes < 60)
    return `Last used ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  if (hours < 24) return `Last used ${hours} hour${hours === 1 ? "" : "s"} ago`;
  return `Last used ${days} day${days === 1 ? "" : "s"} ago`;
}

const CopyIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const EyeIcon = ({ hidden }: { hidden: boolean }) => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
  >
    {hidden ? (
      <>
        <path d="M2.5 12C3.7 7.9 7.5 5 12 5s8.3 2.9 9.5 7c-1.2 4.1-5 7-9.5 7S3.7 16.1 2.5 12z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 5.2A10 10 0 0112 5c4.5 0 8.3 2.9 9.5 7a10.7 10.7 0 01-2.1 3.8M6.2 6.2A10.3 10.3 0 002.5 12c1.2 4.1 5 7 9.5 7a10 10 0 004.1-.9" />
      </>
    )}
  </svg>
);

export default function ApiKeyCard({
  id,
  name,
  keyValue,
  createdAt,
  lastUsedAt,
  status,
  isNew = false,
  onCopy,
  onRevoke,
  onNameChange,
}: ApiKeyCardProps) {
  const [isRevealed, setIsRevealed] = useState(isNew);
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(name);

  const maskedKey = isRevealed
    ? keyValue
    : `${keyValue.slice(0, 7)}${"•".repeat(Math.max(8, keyValue.length - 11))}${keyValue.slice(-4)}`;

  const handleCopy = async () => {
    await onCopy(keyValue);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2_000);
  };

  const handleRevoke = async () => {
    if (!confirmRevoke) {
      setConfirmRevoke(true);
      return;
    }
    await onRevoke(id);
    setConfirmRevoke(false);
  };

  const handleNameSave = () => {
    const nextName = editedName.trim();
    if (nextName && nextName !== name) onNameChange?.(id, nextName);
    else setEditedName(name);
    setIsEditingName(false);
  };

  return (
    <div className="border-t border-line-soft py-3">
      {isNew && (
        <div className="mb-2.5 rounded-[10px] border border-red-border bg-red-tint px-3 py-2 text-xs text-red-text">
          Copy this key now — you won&apos;t be able to see it again.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          {isEditingName ? (
            <input
              autoFocus
              value={editedName}
              onChange={(event) => setEditedName(event.currentTarget.value)}
              onBlur={handleNameSave}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleNameSave();
                if (event.key === "Escape") {
                  setEditedName(name);
                  setIsEditingName(false);
                }
              }}
              className="w-40 rounded-lg border border-line-strong bg-surface-2 px-2 py-1 text-[13px] font-semibold text-fg outline-none focus:border-blue"
            />
          ) : (
            <button
              type="button"
              onClick={() => onNameChange && setIsEditingName(true)}
              className="cursor-pointer border-0 bg-transparent p-0 text-[13px] font-semibold text-fg"
              title={onNameChange ? "Edit key name" : undefined}
            >
              {name}
            </button>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
              status === "active"
                ? "bg-green-tint text-green"
                : "bg-fill text-fg-4"
            }`}
          >
            {status === "active" ? "Active" : "Never used"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line-strong bg-transparent px-2.5 py-1 text-[11.5px] text-fg-4 hover:bg-hover"
          >
            <CopyIcon />
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={handleRevoke}
            onBlur={() => setConfirmRevoke(false)}
            className={`cursor-pointer rounded-lg border px-2.5 py-1 text-[11.5px] ${
              confirmRevoke
                ? "border-red bg-red text-white"
                : "border-red-border bg-transparent text-red-text hover:bg-red-tint"
            }`}
          >
            {confirmRevoke ? "Confirm revoke" : "Revoke"}
          </button>
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="max-w-[310px] truncate font-mono text-[11.5px] text-fg-3">
            {maskedKey}
          </span>
          <button
            type="button"
            onClick={() => setIsRevealed((revealed) => !revealed)}
            className="flex cursor-pointer border-0 bg-transparent p-0.5 text-faint"
            aria-label={isRevealed ? "Hide key" : "Reveal key"}
          >
            <EyeIcon hidden={!isRevealed} />
          </button>
        </div>
        <span className="text-[11px] text-faint">
          Created {formatDate(createdAt)}
        </span>
        <span className="text-[11px] text-faint">
          {formatLastUsed(lastUsedAt)}
        </span>
      </div>
    </div>
  );
}

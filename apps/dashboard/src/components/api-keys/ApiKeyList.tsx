import ApiKeyCard from "./ApiKeyCard";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  created_at: string;
  last_used_at?: string;
  status: "active" | "never_used";
}

interface ApiKeyListProps {
  keys: ApiKey[];
  loading: boolean;
  newKeyValue?: string;
  onCreateClick: () => void;
  onCopyKey: (keyValue: string) => void | Promise<void>;
  onRevokeKey: (keyId: string) => void | Promise<void>;
  onNameChange?: (keyId: string, newName: string) => void;
}

const PlusIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M12 4v16m8-8H4" />
  </svg>
);

export default function ApiKeyList({
  keys,
  loading,
  newKeyValue,
  onCreateClick,
  onCopyKey,
  onRevokeKey,
  onNameChange,
}: ApiKeyListProps) {
  return (
    <section
      id="api-keys"
      className="scroll-mt-4 rounded-2xl border border-line bg-surface p-5"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-[-0.015em] text-fg">
            API keys
          </h2>
          <p className="mt-0.5 text-xs text-dim">
            Used to authenticate requests to the Traces API.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreateClick}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[9px] border-0 bg-blue px-3 py-1.5 text-[12.5px] font-semibold text-white hover:opacity-90"
        >
          <PlusIcon />
          Create key
        </button>
      </div>

      {newKeyValue && !keys.some((key) => key.key === newKeyValue) && (
        <div className="mb-2.5 rounded-[10px] border border-red-border bg-red-tint px-3 py-2 text-xs text-red-text">
          Copy the key shown in the creation dialog now — you won&apos;t be able
          to see it again.
        </div>
      )}

      {loading ? (
        <div className="border-t border-line-soft py-8 text-center text-xs text-dim">
          Loading keys...
        </div>
      ) : keys.length === 0 ? (
        <div className="border-t border-line-soft py-8 text-center">
          <p className="text-xs text-dim">No API keys yet.</p>
          <button
            type="button"
            onClick={onCreateClick}
            className="mt-2 cursor-pointer border-0 bg-transparent text-xs text-blue"
          >
            Create your first key
          </button>
        </div>
      ) : (
        <div>
          {keys.map((key) => (
            <ApiKeyCard
              key={key.id}
              id={key.id}
              name={key.name}
              keyValue={key.key}
              createdAt={key.created_at}
              lastUsedAt={key.last_used_at}
              status={key.status}
              isNew={Boolean(newKeyValue && key.key === newKeyValue)}
              onCopy={onCopyKey}
              onRevoke={onRevokeKey}
              onNameChange={onNameChange}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export type { ApiKey };

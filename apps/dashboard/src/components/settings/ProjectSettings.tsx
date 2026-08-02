import { useState } from "react";
import type { ProjectInfo } from "../../pages/Settings";

interface ProjectSettingsProps {
  project: ProjectInfo;
  saveStatus: "idle" | "saving" | "saved" | "error";
  onSave: (name: string) => void;
}

const CopyIcon = () => (
  <svg
    className="h-3.5 w-3.5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.7}
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  </svg>
);

export default function ProjectSettings({
  project,
  saveStatus,
  onSave,
}: ProjectSettingsProps) {
  const [name, setName] = useState(project.name);
  const [copied, setCopied] = useState(false);

  const handleCopyId = async () => {
    await navigator.clipboard.writeText(project.id);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2_000);
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold tracking-[-0.015em] text-fg">
        Project settings
      </h2>
      <p className="mt-0.5 mb-4 text-xs text-dim">
        Manage the selected project.
      </p>

      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(name);
        }}
      >
        <label className="text-xs text-fg-4">
          <span className="mb-1.5 block font-medium text-fg-3">
            Project name
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-fg outline-none focus:border-blue"
          />
          <span className="mt-1 block text-faint">
            Used to identify your project in the dashboard.
          </span>
        </label>

        <label className="text-xs text-fg-4">
          <span className="mb-1.5 block font-medium text-fg-3">Project ID</span>
          <div className="flex gap-2">
            <input
              readOnly
              value={project.id}
              className="min-w-0 flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2 font-mono text-xs text-faint"
            />
            <button
              type="button"
              onClick={handleCopyId}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line-strong px-3 py-2 text-xs text-fg-4 hover:bg-hover"
            >
              <CopyIcon />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </label>

        <div className="text-xs">
          <span className="font-medium text-fg-3">Created</span>
          <span className="ml-2 text-faint">
            {new Date(project.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>

        <div>
          <button
            type="submit"
            disabled={saveStatus === "saving"}
            className="cursor-pointer rounded-lg bg-blue px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {saveStatus === "saving"
              ? "Saving..."
              : saveStatus === "saved"
                ? "Saved"
                : "Save changes"}
          </button>
          {saveStatus === "error" && (
            <span className="ml-3 text-xs text-red-text">
              Failed to save changes
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

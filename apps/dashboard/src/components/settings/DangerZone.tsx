import { useState } from "react";

interface DangerZoneProps {
  projectName: string;
  onDeleteProject: () => void | Promise<void>;
}

export default function DangerZone({
  projectName,
  onDeleteProject,
}: DangerZoneProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const canDelete = confirmText === projectName;

  const closeModal = () => {
    setShowDeleteModal(false);
    setConfirmText("");
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteProject();
    } catch (error) {
      console.error("Failed to delete project:", error);
      setIsDeleting(false);
    }
  };

  return (
    <>
      <section className="rounded-2xl border border-red-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-[-0.015em] text-red-text">
          Danger zone
        </h2>
        <p className="mt-0.5 mb-4 text-xs text-dim">
          Irreversible actions that affect your entire project.
        </p>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-red-border bg-red-tint px-4 py-3">
          <div>
            <div className="text-[13px] font-semibold text-fg">
              Delete project
            </div>
            <p className="mt-0.5 text-xs text-dim">
              Permanently delete this project and all associated data.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="shrink-0 cursor-pointer rounded-lg border border-red-border px-3 py-1.5 text-xs text-red-text hover:bg-red-tint-2"
          >
            Delete project
          </button>
        </div>
      </section>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-line bg-surface shadow-xl">
            <div className="border-b border-line px-4 py-3">
              <h3 className="text-sm font-semibold">Delete project</h3>
            </div>
            <div className="p-4">
              <div className="mb-4 rounded-xl border border-red-border bg-red-tint px-3 py-2.5">
                <p className="text-sm font-medium text-red-text">
                  This action cannot be undone
                </p>
                <p className="mt-1 text-xs text-dim">
                  All traces, sessions, API keys, and analytics data will be
                  permanently deleted.
                </p>
              </div>
              <p className="mb-3 text-sm text-fg-4">
                Type <span className="font-mono text-fg">{projectName}</span> to
                confirm.
              </p>
              <input
                value={confirmText}
                onChange={(event) => setConfirmText(event.currentTarget.value)}
                placeholder={projectName}
                className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-fg outline-none placeholder:text-faint focus:border-red"
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
              <button
                type="button"
                onClick={closeModal}
                className="cursor-pointer rounded-lg border border-line-strong px-4 py-2 text-sm text-fg-4 hover:bg-hover"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canDelete || isDeleting}
                className="cursor-pointer rounded-lg bg-red px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

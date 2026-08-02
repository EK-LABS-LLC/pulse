import { useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import ApiKeyList, { type ApiKey } from "../components/api-keys/ApiKeyList";
import CreateApiKeyModal from "../components/api-keys/CreateApiKeyModal";
import {
  type CreateProjectUserInput,
  type ProjectUserInfo,
} from "../lib/apiClient";
import {
  useApiKeysQuery,
  useCreateProjectUserMutation,
  useDeleteApiKeyMutation,
  useProjectUsersQuery,
  useUpdateApiKeyNameMutation,
} from "../api";
import { useProject } from "../hooks/useProject";

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

const CloseIcon = () => (
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
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

interface ApiKeysProps {
  embedded?: boolean;
  afterKeys?: ReactNode;
}

export default function ApiKeys({ embedded = false, afterKeys }: ApiKeysProps) {
  const { selectedProject } = useProject();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string>();
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState<{
    name: string;
    email: string;
    password: string;
    role: "admin" | "user";
  }>({ name: "", email: "", password: "", role: "user" });

  const apiKeysQuery = useApiKeysQuery(selectedProject?.id);
  const usersQuery = useProjectUsersQuery(selectedProject?.id);
  const deleteApiKeyMutation = useDeleteApiKeyMutation(selectedProject?.id);
  const createUserMutation = useCreateProjectUserMutation(selectedProject?.id);
  const updateApiKeyNameMutation = useUpdateApiKeyNameMutation(
    selectedProject?.id,
  );

  const keys: ApiKey[] = useMemo(
    () =>
      (apiKeysQuery.data?.keys ?? []).map((key) => ({
        id: key.id,
        name: key.name,
        key: key.key,
        created_at: key.createdAt,
        last_used_at: key.lastUsedAt,
        status: key.lastUsedAt ? "active" : "never_used",
      })),
    [apiKeysQuery.data],
  );
  const users: ProjectUserInfo[] = usersQuery.data?.users ?? [];

  const resetCreateUserState = () => {
    setCreateUserError(null);
    setNewUser({ name: "", email: "", password: "", role: "user" });
  };

  const handleKeyCreated = (fullKey: string) => {
    setNewKeyValue(fullKey);
    queryClient.invalidateQueries({
      queryKey: ["api-keys", selectedProject?.id],
    });
  };

  const handleCreateUser = async () => {
    setCreateUserError(null);
    const payload: CreateProjectUserInput = {
      email: newUser.email.trim(),
      role: newUser.role,
    };
    if (newUser.name.trim()) payload.name = newUser.name.trim();
    if (newUser.password.trim()) payload.password = newUser.password;

    try {
      await createUserMutation.mutateAsync(payload);
      setShowCreateUserModal(false);
      resetCreateUserState();
    } catch (error) {
      setCreateUserError(
        error instanceof Error ? error.message : "Failed to create user",
      );
    }
  };

  const content = (
    <>
      {apiKeysQuery.error instanceof Error && (
        <div className="rounded-xl border border-red-border bg-red-tint px-4 py-3 text-xs text-red-text">
          <div className="flex items-center justify-between gap-3">
            <span>{apiKeysQuery.error.message}</span>
            <button
              type="button"
              onClick={() => apiKeysQuery.refetch()}
              className="cursor-pointer border-0 bg-transparent text-blue"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <ApiKeyList
        keys={keys}
        loading={apiKeysQuery.isPending}
        newKeyValue={newKeyValue}
        onCreateClick={() => setShowCreateModal(true)}
        onCopyKey={(key) => navigator.clipboard.writeText(key)}
        onRevokeKey={async (keyId) => {
          try {
            await deleteApiKeyMutation.mutateAsync(keyId);
          } catch (error) {
            console.error("Failed to revoke key:", error);
          }
        }}
        onNameChange={(keyId, name) =>
          updateApiKeyNameMutation
            .mutateAsync({ keyId, name })
            .catch((error) => {
              console.error("Failed to update key name:", error);
            })
        }
      />

      {afterKeys}

      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-[-0.015em] text-fg">
              Project users
            </h2>
            <p className="mt-0.5 text-xs text-dim">
              Manage access to the selected project.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetCreateUserState();
              setShowCreateUserModal(true);
            }}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[9px] border border-line-strong bg-transparent px-3 py-1.5 text-[12.5px] font-semibold text-fg-3 hover:bg-hover"
          >
            <PlusIcon />
            Add user
          </button>
        </div>

        {usersQuery.error instanceof Error && (
          <div className="mb-3 rounded-xl border border-red-border bg-red-tint px-3 py-2 text-xs text-red-text">
            {usersQuery.error.message}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-line">
          <div className="grid grid-cols-[1fr_1.35fr_0.65fr_1fr] gap-3 border-b border-line bg-surface-2 px-3 py-2 text-[11px] font-semibold text-dim">
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span>Added</span>
          </div>
          {usersQuery.isPending ? (
            <div className="px-3 py-6 text-center text-xs text-dim">
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-dim">
              No users in this project yet.
            </div>
          ) : (
            users.map((projectUser) => (
              <div
                key={projectUser.userId}
                className="grid grid-cols-[1fr_1.35fr_0.65fr_1fr] items-center gap-3 border-t border-line-soft px-3 py-2.5 text-xs first:border-t-0"
              >
                <span className="truncate text-fg-2">{projectUser.name}</span>
                <span className="truncate text-fg-3">{projectUser.email}</span>
                <span>
                  <span className="rounded-full bg-fill px-2 py-0.5 text-[10.5px] text-fg-4">
                    {projectUser.role}
                  </span>
                </span>
                <span className="text-faint">
                  {new Date(projectUser.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );

  return (
    <>
      {embedded ? (
        content
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-14 shrink-0 items-center border-b border-line bg-topbar px-5">
            <h1 className="text-[19px] font-semibold tracking-[-0.022em]">
              API keys
            </h1>
          </header>
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto flex max-w-[640px] flex-col gap-4 p-6">
              {content}
            </div>
          </div>
        </div>
      )}

      <CreateApiKeyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onKeyCreated={handleKeyCreated}
      />

      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-line bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h3 className="text-sm font-semibold">Add user to project</h3>
              <button
                type="button"
                onClick={() => setShowCreateUserModal(false)}
                className="cursor-pointer rounded-lg p-1 text-faint hover:bg-hover"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="flex flex-col gap-3 p-4">
              <Field
                label="Email"
                type="email"
                value={newUser.email}
                placeholder="user@company.com"
                onChange={(email) =>
                  setNewUser((current) => ({ ...current, email }))
                }
              />
              <Field
                label="Name (required for new users)"
                value={newUser.name}
                placeholder="Jane Doe"
                onChange={(name) =>
                  setNewUser((current) => ({ ...current, name }))
                }
              />
              <Field
                label="Password (required for new users)"
                type="password"
                value={newUser.password}
                placeholder="At least 8 characters"
                onChange={(password) =>
                  setNewUser((current) => ({ ...current, password }))
                }
              />
              <label className="text-xs text-fg-4">
                <span className="mb-1 block">Role</span>
                <select
                  value={newUser.role}
                  onChange={(event) =>
                    setNewUser((current) => ({
                      ...current,
                      role: event.currentTarget.value as "admin" | "user",
                    }))
                  }
                  className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-fg outline-none focus:border-blue"
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </label>
              <p className="text-xs text-faint">
                If the email already exists, this adds that account to the
                selected project.
              </p>
              {createUserError && (
                <div className="rounded-lg border border-red-border bg-red-tint px-3 py-2 text-xs text-red-text">
                  {createUserError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
              <button
                type="button"
                onClick={() => setShowCreateUserModal(false)}
                disabled={createUserMutation.isPending}
                className="cursor-pointer rounded-lg border border-line-strong px-4 py-2 text-sm text-fg-4 hover:bg-hover"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateUser}
                disabled={createUserMutation.isPending}
                className="cursor-pointer rounded-lg bg-blue px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {createUserMutation.isPending ? "Adding..." : "Add user"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  type = "text",
  value,
  placeholder,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs text-fg-4">
      <span className="mb-1 block">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.currentTarget.value)}
        className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-fg outline-none placeholder:text-faint focus:border-blue"
      />
    </label>
  );
}

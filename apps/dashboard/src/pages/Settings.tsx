import { useEffect, useState } from "react";
import ApiKeys from "./ApiKeys";
import AppearanceSettings from "../components/settings/AppearanceSettings";
import DangerZone from "../components/settings/DangerZone";
import ProfileCard from "../components/settings/ProfileCard";
import ProjectSettings from "../components/settings/ProjectSettings";
import TraceDefaultsSettings from "../components/settings/TraceDefaultsSettings";
import { useProjectUsersQuery } from "../api";
import { useAuth } from "../hooks/useAuth";
import { useProject } from "../hooks/useProject";

export interface ProjectInfo {
  id: string;
  name: string;
  createdAt: string;
}

export default function Settings() {
  const { user } = useAuth();
  const { selectedProject } = useProject();
  const usersQuery = useProjectUsersQuery(selectedProject?.id);
  const [projectNameOverrides, setProjectNameOverrides] = useState<
    Record<string, string>
  >({});
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  useEffect(() => {
    if (window.location.hash !== "#api-keys") return;
    const target = document.getElementById("api-keys");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const project = selectedProject
    ? {
        id: selectedProject.id,
        name: projectNameOverrides[selectedProject.id] ?? selectedProject.name,
        createdAt: selectedProject.createdAt,
      }
    : null;

  const projectUser = usersQuery.data?.users.find(
    (candidate) =>
      candidate.userId === user?.id || candidate.email === user?.email,
  );
  const role = projectUser?.role
    ? `${projectUser.role[0]?.toUpperCase()}${projectUser.role.slice(1)}`
    : "Member";

  const handleSaveProject = async (name: string) => {
    setSaveStatus("saving");
    try {
      // Preserve the existing local-only behavior until a project update
      // endpoint is available.
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (selectedProject) {
        setProjectNameOverrides((current) => ({
          ...current,
          [selectedProject.id]: name,
        }));
      }
      setSaveStatus("saved");
      window.setTimeout(() => setSaveStatus("idle"), 2_000);
    } catch (error) {
      setSaveStatus("error");
      console.error("Failed to save project:", error);
    }
  };

  const handleDeleteProject = async () => {
    // Preserve the existing placeholder behavior until deletion is supported.
    window.location.href = "/login";
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center border-b border-line bg-topbar px-5 backdrop-blur-lg">
        <h1 className="text-[19px] font-semibold tracking-[-0.022em]">
          Settings
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <main className="mx-auto flex max-w-[640px] flex-col gap-4 p-6">
          {user && (
            <ProfileCard name={user.name} email={user.email} role={role} />
          )}
          <AppearanceSettings />
          <TraceDefaultsSettings />
          <ApiKeys
            embedded
            afterKeys={
              <>
                {project && (
                  <ProjectSettings
                    key={project.id}
                    project={project}
                    saveStatus={saveStatus}
                    onSave={handleSaveProject}
                  />
                )}
                {project && (
                  <DangerZone
                    projectName={project.name}
                    onDeleteProject={handleDeleteProject}
                  />
                )}
              </>
            }
          />
        </main>
      </div>
    </div>
  );
}

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
        name: selectedProject.name,
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

  // Renaming and deleting a project both need a server endpoint that does not
  // exist yet. Until it does, these report that the action is unavailable
  // rather than reporting a success the server never performed.
  const handleSaveProject = async () => {
    setSaveStatus("error");
  };

  const handleDeleteProject = async () => {
    throw new Error("Deleting a project is not available yet.");
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

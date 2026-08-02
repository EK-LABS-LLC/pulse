import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useProject } from "../../hooks/useProject";
import { useTheme } from "../../hooks/useTheme";

function Chevron() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}

function useDismissOnOutsideClick(
  ref: React.RefObject<HTMLElement | null>,
  onDismiss: () => void,
) {
  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onDismiss();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [ref, onDismiss]);
}

export function Topbar() {
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const projectRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const { projects, selectedProject, setSelectedProject } = useProject();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useDismissOnOutsideClick(projectRef, () => setProjectMenuOpen(false));
  useDismissOnOutsideClick(userRef, () => setUserMenuOpen(false));

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const displayName = user?.name || user?.email || "User";
  const userInitial =
    user?.name?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    "U";

  const menuStyle = {
    background: "var(--surface-4)",
    border: "1px solid var(--border)",
    boxShadow: "0 8px 24px var(--shadow-c)",
  };

  return (
    <header
      className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-3 px-4 backdrop-blur"
      style={{
        background: "var(--topbar)",
        borderBottom: "1px solid var(--border-soft)",
      }}
    >
      <div className="relative" ref={projectRef}>
        <button
          type="button"
          onClick={() => setProjectMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={projectMenuOpen}
          className="flex cursor-pointer items-center gap-2 rounded-lg border-0 px-2.5 py-1.5 text-sm transition-colors"
          style={{ background: "var(--fill)", color: "var(--text-2)" }}
        >
          <span className="max-w-[200px] truncate">
            {selectedProject?.name || "No project"}
          </span>
          <Chevron />
        </button>

        {projectMenuOpen && (
          <div
            role="menu"
            className="absolute top-full left-0 z-50 mt-1.5 min-w-[220px] overflow-hidden rounded-xl py-1"
            style={menuStyle}
          >
            {projects.length === 0 && (
              <div
                className="px-3 py-2 text-sm"
                style={{ color: "var(--dim)" }}
              >
                No projects yet
              </div>
            )}
            {projects.map((project) => {
              const active = selectedProject?.id === project.id;
              return (
                <button
                  key={project.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setSelectedProject(project);
                    setProjectMenuOpen(false);
                  }}
                  className="w-full cursor-pointer border-0 bg-transparent px-3 py-2 text-left text-sm"
                  style={{ color: active ? "var(--blue)" : "var(--text-3)" }}
                >
                  {project.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={
            theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
          }
          title={
            theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
          }
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-0 transition-colors"
          style={{ background: "var(--fill)", color: "var(--text-3)" }}
        >
          {theme === "dark" ? (
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          ) : (
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          )}
        </button>

        <div className="relative" ref={userRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
            className="flex cursor-pointer items-center gap-2 rounded-lg border-0 py-1 pr-2 pl-1 text-sm transition-colors"
            style={{ background: "var(--fill)", color: "var(--text-2)" }}
          >
            <span
              className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-medium"
              style={{ background: "var(--fill-2)", color: "var(--text-3)" }}
            >
              {userInitial}
            </span>
            <span className="hidden max-w-[160px] truncate sm:inline">
              {displayName}
            </span>
            <Chevron />
          </button>

          {userMenuOpen && (
            <div
              role="menu"
              className="absolute top-full right-0 z-50 mt-1.5 min-w-[200px] overflow-hidden rounded-xl py-1"
              style={menuStyle}
            >
              <NavLink
                to="/dashboard/account"
                role="menuitem"
                onClick={() => setUserMenuOpen(false)}
                className="block px-3 py-2 text-sm no-underline"
                style={{ color: "var(--text-3)" }}
              >
                Account
              </NavLink>
              <NavLink
                to="/dashboard/settings"
                role="menuitem"
                onClick={() => setUserMenuOpen(false)}
                className="block px-3 py-2 text-sm no-underline"
                style={{ color: "var(--text-3)" }}
              >
                Settings
              </NavLink>
              <div
                className="my-1 h-px"
                style={{ background: "var(--border-soft)" }}
              />
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="w-full cursor-pointer border-0 bg-transparent px-3 py-2 text-left text-sm"
                style={{ color: "var(--red-text)" }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

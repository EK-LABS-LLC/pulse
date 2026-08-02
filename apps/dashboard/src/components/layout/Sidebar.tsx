import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";

interface NavItem {
  to: string;
  label: string;
  path: string;
  end?: boolean;
}

const navItems: NavItem[] = [
  { to: "/dashboard", label: "Overview", end: true, path: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { to: "/dashboard/traces", label: "Traces", path: "M4 6h16M4 12h16M4 18h7" },
  { to: "/dashboard/sessions", label: "Sessions", path: "M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" },
  { to: "/dashboard/analytics", label: "Analytics", path: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
];

function RailLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      aria-label={item.label}
      className="group relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors"
      style={({ isActive }) => ({
        background: isActive ? "var(--blue-tint)" : "transparent",
        color: isActive ? "var(--blue)" : "var(--dim)",
      })}
    >
      <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={item.path} />
      </svg>
      <span role="tooltip" className="pointer-events-none absolute left-full z-50 ml-2 hidden rounded-md px-2 py-1 text-xs whitespace-nowrap group-hover:block" style={{ background: "var(--surface-4)", color: "var(--text)", border: "1px solid var(--border)", boxShadow: "0 4px 12px var(--shadow-c)" }}>
        {item.label}
      </span>
    </NavLink>
  );
}

export function Sidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userInitial = user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U";
  const displayName = user?.name || user?.email || "User";

  return (
    <aside className="relative flex h-full w-14 shrink-0 flex-col items-center gap-1 py-4" style={{ borderRight: "1px solid var(--border)", background: "var(--bg)" }}>
      <NavLink to="/dashboard" aria-label="Pulse" className="mb-3.5 flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold" style={{ background: "var(--surface-2)", color: "var(--text)", boxShadow: "inset 0 0 0 1px var(--border-strong)" }}>P</NavLink>
      <nav className="flex flex-col items-center gap-1">{navItems.map((item) => <RailLink key={item.to} item={item} />)}</nav>
      <div className="flex-1" />

      <div className="mb-3 flex flex-col gap-0.5 rounded-xl border p-0.5" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
        <button type="button" aria-label="Switch to dark theme" onClick={() => theme !== "dark" && toggleTheme()} className="flex h-[30px] w-8 cursor-pointer items-center justify-center rounded-[9px] border-0 text-sm" style={{ background: theme === "dark" ? "var(--fill-2)" : "transparent", color: theme === "dark" ? "var(--text)" : "var(--faint)" }}>◐</button>
        <button type="button" aria-label="Switch to light theme" onClick={() => theme !== "light" && toggleTheme()} className="flex h-[30px] w-8 cursor-pointer items-center justify-center rounded-[9px] border-0 text-sm" style={{ background: theme === "light" ? "var(--fill-2)" : "transparent", color: theme === "light" ? "var(--text)" : "var(--faint)" }}>☼</button>
      </div>

      <div className="relative">
        <button type="button" aria-label="Open user menu" aria-expanded={userMenuOpen} onClick={() => setUserMenuOpen((open) => !open)} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-0 text-xs font-semibold" style={{ background: "var(--fill-2)", color: "var(--text-4)" }}>{userInitial}</button>
        {userMenuOpen && <div role="menu" className="absolute bottom-0 left-10 z-50 flex w-[220px] flex-col gap-0.5 rounded-[14px] border p-1.5 shadow-2xl" style={{ background: "var(--surface-2)", borderColor: "var(--border)", boxShadow: "0 12px 32px var(--shadow-c)" }}>
          <div className="flex items-center gap-2.5 px-2.5 pt-2.5 pb-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold" style={{ background: "var(--fill-2)", color: "var(--text-4)" }}>{userInitial}</span><div className="min-w-0"><div className="truncate text-[13px] font-semibold" style={{ color: "var(--text)" }}>{displayName}</div><div className="truncate text-[11.5px]" style={{ color: "var(--faint)" }}>{user?.email || ""}</div></div></div>
          <div className="mx-1 my-0.5 h-px" style={{ background: "var(--border)" }} />
          <button type="button" role="menuitem" onClick={() => { setUserMenuOpen(false); navigate("/dashboard/settings"); }} className="flex cursor-pointer items-center gap-2.5 rounded-[9px] border-0 bg-transparent px-2.5 py-2 text-left text-[13px]" style={{ color: "var(--text)" }}>⚙ Settings</button>
          <div className="mx-1 my-1 h-px" style={{ background: "var(--border)" }} />
          <button type="button" role="menuitem" onClick={async () => { await logout(); navigate("/login"); }} className="flex cursor-pointer items-center gap-2.5 rounded-[9px] border-0 bg-transparent px-2.5 py-2 text-left text-[13px]" style={{ color: "var(--dim)" }}>↪ Log out</button>
        </div>}
      </div>
    </aside>
  );
}

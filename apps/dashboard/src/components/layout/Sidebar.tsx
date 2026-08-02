import { NavLink } from "react-router-dom";

interface NavItem {
  to: string;
  label: string;
  path: string;
  end?: boolean;
}

const navItems: NavItem[] = [
  {
    to: "/dashboard",
    label: "Overview",
    end: true,
    path: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    to: "/dashboard/traces",
    label: "Traces",
    path: "M4 6h16M4 12h16M4 18h7",
  },
  {
    to: "/dashboard/sessions",
    label: "Sessions",
    path: "M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z",
  },
  {
    to: "/dashboard/analytics",
    label: "Analytics",
    path: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  },
];

const settingsItems: NavItem[] = [
  {
    to: "/dashboard/api-keys",
    label: "API Keys",
    path: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z",
  },
  {
    to: "/dashboard/settings",
    label: "Settings",
    path: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
  },
];

function RailLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      aria-label={item.label}
      className="group relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
      style={({ isActive }) => ({
        background: isActive ? "var(--blue-tint)" : "transparent",
        color: isActive ? "var(--blue)" : "var(--dim)",
      })}
    >
      <svg
        className="h-[18px] w-[18px]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d={item.path}
        />
      </svg>

      {/* The rail is icon-only, so the label has to be reachable on hover. */}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-full z-50 ml-2 hidden rounded-md px-2 py-1 text-xs whitespace-nowrap group-hover:block"
        style={{
          background: "var(--surface-4)",
          color: "var(--text)",
          border: "1px solid var(--border)",
          boxShadow: "0 4px 12px var(--shadow-c)",
        }}
      >
        {item.label}
      </span>
    </NavLink>
  );
}

export function Sidebar() {
  return (
    <aside
      className="flex h-full w-14 shrink-0 flex-col items-center gap-1 py-3"
      style={{
        borderRight: "1px solid var(--border-soft)",
        background: "var(--surface-3)",
      }}
    >
      <NavLink
        to="/dashboard"
        aria-label="Pulse"
        className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold"
        style={{ background: "var(--blue)", color: "#fff" }}
      >
        P
      </NavLink>

      <nav className="flex flex-col items-center gap-1">
        {navItems.map((item) => (
          <RailLink key={item.to} item={item} />
        ))}
      </nav>

      <div
        className="my-2 h-px w-6"
        style={{ background: "var(--border-soft)" }}
      />

      <nav className="flex flex-col items-center gap-1">
        {settingsItems.map((item) => (
          <RailLink key={item.to} item={item} />
        ))}
      </nav>
    </aside>
  );
}

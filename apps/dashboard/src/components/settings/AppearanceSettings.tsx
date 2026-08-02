import { useTheme } from "../../hooks/useTheme";
import type { Theme } from "../../contexts/theme-context";

const MoonIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
  >
    <path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z" />
  </svg>
);

const SunIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

export default function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  const option = (value: Theme, label: string, icon: React.ReactNode) => {
    const active = theme === value;
    return (
      <button
        type="button"
        onClick={() => setTheme(value)}
        className="flex cursor-pointer items-center gap-1.5 rounded-lg border-0 px-3.5 py-1.5 text-[12.5px]"
        style={{
          background: active ? "var(--seg-active)" : "transparent",
          color: active ? "var(--text)" : "var(--dim)",
          boxShadow: active ? "0 1px 2px var(--shadow-c)" : undefined,
        }}
      >
        {icon}
        {label}
      </button>
    );
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold tracking-[-0.015em] text-fg">
        Appearance
      </h2>
      <p className="mt-0.5 mb-3.5 text-xs text-dim">
        Choose how Traces looks on this device.
      </p>
      <div className="inline-flex items-center gap-0.5 rounded-[10px] border border-line bg-surface-2 p-0.5">
        {option("dark", "Dark", <MoonIcon />)}
        {option("light", "Light", <SunIcon />)}
      </div>
    </section>
  );
}

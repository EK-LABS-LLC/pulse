export function fmtLatency(ms: number | null | undefined): string {
  if (ms == null) return "—";
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

export function fmtDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return `${m}m ${rs}s`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${rm}m`;
}

export function fmtCost(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return cents < 100
    ? `$${(cents / 100).toFixed(4)}`
    : `$${(cents / 100).toFixed(2)}`;
}

export function fmtTokens(n: number | null | undefined): string {
  if (n == null) return "0";
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export function fmtRel(
  iso: string | null | undefined,
  now = Date.now(),
): string {
  if (!iso) return "—";
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return "—";
  const m = Math.round((now - at) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function fmtAbs(iso: string | null | undefined): string {
  if (!iso) return "—";
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? "—" : at.toLocaleString();
}

/**
 * Points for a 64x22 sparkline polyline. A flat series would divide by zero on
 * range, so it collapses to the baseline instead.
 */
export function sparkPath(values: number[]): string {
  const w = 64;
  const h = 22;
  const pad = 2;
  if (values.length === 0) return "";
  if (values.length === 1) return `${w / 2},${h / 2}`;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * (w - pad * 2) + pad;
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/**
 * Fades any CSS colour toward transparent. Themeable tokens are `var(--x)`
 * rather than hex, which `rgba()` cannot take apart, so this leans on
 * color-mix and keeps the hex branch for literal colours.
 */
export function tint(color: string, alpha: number): string {
  if (!color) return "transparent";
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((x) => x + x)
            .join("")
        : hex;
    const n = parseInt(full, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
  }
  return `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`;
}

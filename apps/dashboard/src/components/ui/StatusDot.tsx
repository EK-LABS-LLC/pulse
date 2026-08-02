interface StatusDotProps {
  status: "success" | "error" | string;
  live?: boolean;
  title?: string;
}

export function StatusDot({ status, live, title }: StatusDotProps) {
  const isError = status === "error";
  const color = isError ? "var(--red)" : "var(--green)";
  const glow = isError ? "var(--red-border)" : "var(--green-border)";

  return (
    <span
      title={title ?? status}
      className="inline-block h-[7px] w-[7px] shrink-0 rounded-full"
      style={{
        background: color,
        boxShadow: `0 0 0 3px ${glow}`,
        animation: live ? "livePulse 2s ease-in-out infinite" : undefined,
      }}
    />
  );
}

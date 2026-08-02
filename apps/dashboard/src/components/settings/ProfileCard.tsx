interface ProfileCardProps {
  name: string;
  email: string;
  role: string;
}

function initialsFor(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length > 0) {
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }
  return email.slice(0, 2).toUpperCase();
}

export default function ProfileCard({ name, email, role }: ProfileCardProps) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-center gap-3.5">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-fill-2 text-base font-semibold text-fg-4">
          {initialsFor(name, email)}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-fg">
            {name || email}
          </div>
          <div className="mt-0.5 truncate text-[12.5px] text-faint">
            {email} · {role}
          </div>
        </div>
      </div>
    </section>
  );
}

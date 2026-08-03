export default function Analytics() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex h-14 flex-shrink-0 items-center border-b border-line bg-topbar px-5 backdrop-blur">
        <h1 className="text-[19px] font-semibold tracking-[-0.022em] text-fg">
          Analytics
        </h1>
      </header>

      <main className="flex flex-1 items-center justify-center overflow-auto p-6">
        <div className="max-w-sm text-center">
          <span className="inline-flex rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-dim">
            Coming soon
          </span>
          <h2 className="mt-4 text-lg font-semibold tracking-[-0.02em] text-fg">
            Analytics is under development
          </h2>
          <p className="mt-2 text-[13px] leading-5 text-dim">
            We’re building a clearer way to explore usage, performance, and cost
            across your projects.
          </p>
        </div>
      </main>
    </div>
  );
}

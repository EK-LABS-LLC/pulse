import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function Layout() {
  return (
    <div
      className="flex h-screen"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex flex-1 flex-col overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

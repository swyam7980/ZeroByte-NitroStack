import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar.js";
import { TopBar } from "./TopBar.js";

/** App shell: fixed sidebar + top bar + scrollable routed canvas. */
export function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 md:ml-64 flex flex-col h-full overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-gutter sm:p-margin-page">
          <div className="max-w-container-max mx-auto space-y-stack-lg">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell({ children, title = "StockPilot", subtitle }) {
  const location = useLocation();
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="ml-64 flex min-h-screen flex-col">
        <Topbar title={title} subtitle={subtitle} />
        {/* Key on location.pathname so each route transition re-runs the entrance animation */}
        <main key={location.pathname} className="anim-fade-up flex-1 p-8">
          {children}
        </main>
        <footer className="border-t border-accent-100 bg-gradient-to-r from-white via-accent-50/30 to-white px-8 py-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>© {new Date().getFullYear()} StockPilot · Built for Ghanaian SMEs.</div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700 ring-1 ring-brand-100">
                Role-based access
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 text-[10px] font-medium text-accent-700 ring-1 ring-accent-200">
                AI-assisted
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

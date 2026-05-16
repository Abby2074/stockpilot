import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell({ children, title = "StockPilot", subtitle }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="ml-64 flex min-h-screen flex-col">
        <Topbar title={title} subtitle={subtitle} />
        <main className="flex-1 p-8">{children}</main>
        <footer className="border-t border-slate-200 bg-white px-8 py-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>© {new Date().getFullYear()} StockPilot · Built for Ghanaian SMEs.</div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700 ring-1 ring-brand-100">
                Role-based access
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 text-[10px] font-medium text-accent-700 ring-1 ring-accent-100">
                AI-assisted
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

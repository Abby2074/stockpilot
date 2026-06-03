import { useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell({ children, title = "StockPilot", subtitle }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="md:ml-64 flex min-h-screen flex-col">
        <Topbar
          title={title}
          subtitle={subtitle}
          onMobileMenu={() => setMobileOpen(true)}
        />
        <main key={location.pathname} className="anim-fade-up flex-1 p-4 md:p-8">
          {children}
        </main>
        <footer className="footer-surface border-t border-accent-950 px-4 md:px-8 py-4 text-xs text-accent-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-accent-200/90">
              © {new Date().getFullYear()} StockPilot · Built for Ghanaian SMEs.
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/20 px-2 py-0.5 text-[10px] font-medium text-brand-300 ring-1 ring-brand-400/40">
                Role-based access
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-500/20 px-2 py-0.5 text-[10px] font-medium text-accent-300 ring-1 ring-accent-400/40">
                AI-assisted
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Boxes,
  LayoutDashboard,
  Package,
  ArrowRightLeft,
  ScanLine,
  Users,
  FileText,
  LogOut,
  ShieldCheck,
  X,
} from "lucide-react";
import { getUser, logout } from "../lib/api";

const SECTIONS = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard",
        roles: ["OWNER", "MANAGER", "STOREKEEPER", "SALES"] },
    ],
  },
  {
    label: "Inventory",
    items: [
      { label: "Products",     icon: Package,        path: "/products",
        roles: ["OWNER", "MANAGER", "STOREKEEPER", "SALES"] },
      { label: "Transactions", icon: ArrowRightLeft, path: "/transactions",
        roles: ["OWNER", "MANAGER", "STOREKEEPER"] },
      { label: "AI Count",     icon: ScanLine,       path: "/ai-count",
        roles: ["OWNER", "MANAGER", "STOREKEEPER"] },
    ],
  },
  {
    label: "Governance",
    items: [
      { label: "Audit Log", icon: FileText, path: "/audit", roles: ["OWNER"] },
      { label: "Users",     icon: Users,    path: "/users", roles: ["OWNER"] },
    ],
  },
];

const ROLE_LABEL = {
  OWNER: "Owner",
  MANAGER: "Manager",
  STOREKEEPER: "Storekeeper",
  SALES: "Sales",
};

export default function Sidebar({ mobileOpen = false, onMobileClose = () => {} }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const role = user?.role || "SALES";

  // Auto-close the drawer when navigating to a new route on mobile
  useEffect(() => {
    if (mobileOpen) onMobileClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <>
      {/* Backdrop on mobile when drawer is open */}
      {mobileOpen && (
        <button
          aria-label="Close menu"
          onClick={onMobileClose}
          className="md:hidden fixed inset-0 z-40 bg-ink-900/50 backdrop-blur-sm"
        />
      )}
      <aside
        className={`sidebar-surface fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-brand-950 transition-transform duration-200 md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand + mobile close button */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-brand-800/50">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-lg ring-1 ring-brand-300/30">
            <Boxes className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold text-white tracking-tight">StockPilot</div>
            <div className="text-[11px] text-brand-300/80">Inventory · Governance · AI</div>
          </div>
          <button
            onClick={onMobileClose}
            className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg text-brand-300 hover:bg-brand-800/60 hover:text-white"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="scroll-area flex-1 overflow-y-auto px-4 py-3">
          {SECTIONS.map((section) => {
            const visible = section.items.filter((n) => n.roles.includes(role));
            if (visible.length === 0) return null;
            return (
              <div key={section.label} className="mb-1">
                <div className="nav-section-label">{section.label}</div>
                <ul className="space-y-0.5">
                  {visible.map(({ label, icon: Icon, path }) => {
                    const active = location.pathname === path;
                    return (
                      <li key={path}>
                        <button
                          onClick={() => navigate(path)}
                          className={`nav-row ${active ? "nav-row-active" : "nav-row-idle"}`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* User card */}
        <div className="border-t border-brand-800/50 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-brand-950/40 px-3 py-2.5 ring-1 ring-brand-800/40">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-accent-400 text-sm font-semibold text-white shadow-sm">
              {user?.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">
                {user?.name || "—"}
              </div>
              <div className="flex items-center gap-1 truncate text-[11px] text-brand-300">
                <ShieldCheck className="h-3 w-3 text-accent-400" />
                {ROLE_LABEL[role] || role}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-300 transition-colors hover:bg-red-900/40 hover:text-red-200"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

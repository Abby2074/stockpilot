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

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const role = user?.role || "SALES";

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm ring-1 ring-brand-700/30">
          <Boxes className="h-5 w-5" />
        </div>
        <div>
          <div className="text-base font-semibold text-slate-900 tracking-tight">StockPilot</div>
          <div className="text-[11px] text-slate-500">Inventory · Governance · AI</div>
        </div>
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
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-700 text-sm font-semibold text-white">
            {user?.name?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-slate-900">
              {user?.name || "—"}
            </div>
            <div className="flex items-center gap-1 truncate text-[11px] text-slate-500">
              <ShieldCheck className="h-3 w-3 text-accent-600" />
              {ROLE_LABEL[role] || role}
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

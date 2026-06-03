import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Loader2, Menu } from "lucide-react";
import { alerts as alertsApi, getUser } from "../lib/api";

const CATEGORY_TONE = {
  PENDING_APPROVAL:  "alert-warning",
  APPROVAL_DECIDED:  "alert-info",
  AI_COUNT_COMPLETE: "alert-info",
  LOW_STOCK:         "alert-warning",
  DISCREPANCY:       "alert-danger",
  STOCK_AVAILABILITY:"alert-success",
  SYSTEM:            "alert-neutral",
};

function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const s = Math.max(1, Math.round((Date.now() - d.getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export default function Topbar({ title, subtitle, onMobileMenu }) {
  const navigate = useNavigate();
  const user = getUser();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const popRef = useRef(null);

  const refresh = async () => {
    try {
      const c = await alertsApi.count();
      setUnread(c.unread || 0);
    } catch {
      // backend not running yet — silent
    }
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 20000);
    // Listen for explicit refresh requests from other pages (e.g. after
    // creating a transaction, the Transactions page dispatches this event
    // so the bell updates immediately instead of waiting 20s).
    const onAsk = () => refresh();
    window.addEventListener("stockpilot:alerts:refresh", onAsk);
    return () => {
      clearInterval(t);
      window.removeEventListener("stockpilot:alerts:refresh", onAsk);
    };
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (popRef.current && !popRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const openPanel = async () => {
    setOpen((v) => !v);
    if (open) return;
    setLoading(true);
    try {
      const data = await alertsApi.list();
      setItems(data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const markAll = async () => {
    try {
      await alertsApi.markAllRead();
      setItems((xs) => xs.map((x) => ({ ...x, read_at: x.read_at || new Date().toISOString() })));
      setUnread(0);
    } catch {}
  };

  const handleItemClick = async (item) => {
    if (!item.read_at) {
      try {
        await alertsApi.markRead(item.id);
        setUnread((n) => Math.max(0, n - 1));
        setItems((xs) =>
          xs.map((x) => (x.id === item.id ? { ...x, read_at: new Date().toISOString() } : x))
        );
      } catch {}
    }
    if (item.link) {
      setOpen(false);
      navigate(item.link);
    }
  };

  return (
    <header className="topbar-surface sticky top-0 z-20 flex h-16 items-center justify-between border-b border-accent-200 px-4 md:px-8 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        {onMobileMenu && (
          <button
            onClick={onMobileMenu}
            aria-label="Open menu"
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-accent-300 bg-white/85 text-accent-700 hover:bg-white"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-base md:text-lg font-semibold text-accent-900 tracking-tight">
            {title}
          </h1>
          {subtitle && <p className="hidden sm:block truncate text-xs text-accent-700/80">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative" ref={popRef}>
          <button
            onClick={openPanel}
            aria-label="Alerts"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-accent-300 bg-white/85 text-accent-700 transition-all hover:bg-white hover:border-accent-400 hover:text-accent-800 active:scale-95 shadow-sm"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="anim-pulse-ring absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-600 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {open && (
            <div className="anim-slide-down absolute right-0 mt-2 w-96 overflow-hidden rounded-xl border border-accent-100 bg-white shadow-lift">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Alerts</div>
                  <div className="text-[11px] text-slate-500">
                    Role-targeted notifications
                  </div>
                </div>
                <button
                  onClick={markAll}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-accent-700 hover:bg-accent-50"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                </button>
              </div>

              <div className="scroll-area max-h-96 overflow-y-auto">
                {loading && (
                  <div className="flex items-center justify-center px-4 py-8 text-sm text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
                {!loading && items.length === 0 && (
                  <div className="px-4 py-10 text-center text-sm text-slate-500">
                    No alerts yet.
                  </div>
                )}
                <ul className="divide-y divide-slate-100">
                  {items.map((it) => (
                    <li key={it.id}>
                      <button
                        onClick={() => handleItemClick(it)}
                        className={`block w-full px-4 py-3 text-left hover:bg-slate-50 ${
                          it.read_at ? "" : "bg-accent-50/30"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium text-slate-900">{it.title}</div>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {timeAgo(it.created_at)}
                          </span>
                        </div>
                        <div className="mt-0.5 line-clamp-2 text-xs text-slate-600">
                          {it.message}
                        </div>
                        <div className="mt-1.5">
                          <span className={`badge ${
                            (CATEGORY_TONE[it.category] || "alert-neutral").replace("alert-", "badge-")
                              .replace("badge-warning", "badge-pending")
                              .replace("badge-success", "badge-approved")
                              .replace("badge-danger", "badge-rejected")
                          }`}>
                            {it.category.replace(/_/g, " ").toLowerCase()}
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="hidden items-center gap-2 rounded-lg border border-accent-200 bg-white/80 px-2.5 py-1.5 shadow-sm sm:flex">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-[10px] font-semibold text-white">
            {user?.name?.[0]?.toUpperCase() || "?"}
          </div>
          <span className="text-xs font-medium text-accent-900">{user?.name || "—"}</span>
        </div>
      </div>
    </header>
  );
}

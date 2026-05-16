import { useEffect, useState } from "react";
import { Plus, Check, X, ShieldCheck } from "lucide-react";
import { getUser, transactions as txApi } from "../lib/api";

const SEED = [
  { id: 1,  product: "Portland cement 50kg",         type: "IN",         qty: 320,  from: "—",          to: "Accra Main", status: "APPROVED", user: "Kwame A.", date: "2026-05-15" },
  { id: 2,  product: "Iron rod 12mm",                type: "OUT",        qty: 80,   from: "Accra Main", to: "—",          status: "APPROVED", user: "Ama S.",   date: "2026-05-15" },
  { id: 3,  product: "Common wire nails 3″",         type: "IN",         qty: 150,  from: "—",          to: "Accra Main", status: "APPROVED", user: "Kwame A.", date: "2026-05-15" },
  { id: 4,  product: "GI steel pipe 2 inch",         type: "TRANSFER",   qty: 60,   from: "Accra Main", to: "Kumasi",     status: "PENDING",  user: "Kofi M.",  date: "2026-05-14" },
  { id: 5,  product: "Sandcrete block 6″",           type: "IN",         qty: 1200, from: "—",          to: "Accra Main", status: "APPROVED", user: "Kwame A.", date: "2026-05-14" },
  { id: 6,  product: "Aluminium roofing sheet 3m",   type: "OUT",        qty: 45,   from: "Accra Main", to: "—",          status: "APPROVED", user: "Ama S.",   date: "2026-05-14" },
  { id: 7,  product: "Iron rod 16mm",                type: "ADJUSTMENT", qty: -12,  from: "Accra Main", to: "—",          status: "PENDING",  user: "Ama S.",   date: "2026-05-13" },
  { id: 8,  product: "Emulsion paint, white 20L",    type: "IN",         qty: 24,   from: "—",          to: "Accra Main", status: "APPROVED", user: "Kwame A.", date: "2026-05-13" },
  { id: 9,  product: "Plywood 18mm 4×8ft",           type: "OUT",        qty: 18,   from: "Accra Main", to: "—",          status: "APPROVED", user: "Ama S.",   date: "2026-05-13" },
  { id: 10, product: "Crushed gravel 20mm",          type: "IN",         qty: 25,   from: "—",          to: "Accra Main", status: "PENDING",  user: "Kofi M.",  date: "2026-05-12" },
  { id: 11, product: "Roofing nails (umbrella head)",type: "IN",         qty: 60,   from: "—",          to: "Accra Main", status: "APPROVED", user: "Kwame A.", date: "2026-05-12" },
  { id: 12, product: "Floor tile 60×60cm",           type: "IN",         qty: 130,  from: "—",          to: "Accra Main", status: "REJECTED", user: "Kofi M.",  date: "2026-05-11" },
  { id: 13, product: "White cement 25kg",            type: "OUT",        qty: 40,   from: "Accra Main", to: "—",          status: "APPROVED", user: "Ama S.",   date: "2026-05-11" },
  { id: 14, product: "PVC drainage pipe 4 inch",     type: "TRANSFER",   qty: 20,   from: "Accra Main", to: "Tema",       status: "APPROVED", user: "Kofi M.",  date: "2026-05-10" },
  { id: 15, product: "Wawa timber 2″×4″ ×12ft",      type: "IN",         qty: 200,  from: "—",          to: "Accra Main", status: "APPROVED", user: "Kwame A.", date: "2026-05-10" },
];

const TYPE_BADGE = {
  IN:         "bg-emerald-950 text-emerald-300 ring-emerald-800",
  OUT:        "bg-red-950 text-red-300 ring-red-800",
  TRANSFER:   "bg-accent-950 text-accent-300 ring-accent-800",
  ADJUSTMENT: "bg-amber-950 text-amber-300 ring-amber-800",
  COUNT:      "bg-brand-950 text-brand-300 ring-brand-800",
};

const STATUS_BADGE = {
  APPROVED: "badge-approved",
  PENDING:  "badge-pending",
  REJECTED: "badge-rejected",
};

export default function Transactions() {
  const user = getUser();
  const role = user?.role;
  const canApprove = ["OWNER", "MANAGER"].includes(role);
  const canCreate = ["OWNER", "MANAGER", "STOREKEEPER"].includes(role);
  const isStorekeeper = role === "STOREKEEPER";

  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    let cancelled = false;
    txApi
      .list()
      .then((data) => {
        if (cancelled) return;
        setItems(data && data.length ? data : SEED);
      })
      .catch(() => { if (!cancelled) setItems(SEED); });
    return () => { cancelled = true; };
  }, []);

  const visibleToUser = isStorekeeper
    ? items.filter((t) =>
        (t.user || "").toLowerCase().includes((user?.name || "").split(" ")[0].toLowerCase()) ||
        items.length < 5
      )
    : items;

  const filtered = filter === "ALL" ? visibleToUser : visibleToUser.filter((t) => t.status === filter);
  const pendingCount = visibleToUser.filter((t) => t.status === "PENDING").length;

  const setStatus = async (id, status) => {
    try {
      if (status === "APPROVED") await txApi.approve(id);
      else if (status === "REJECTED") await txApi.reject(id, "Rejected from dashboard");
    } catch {}
    setItems(items.map((t) => (t.id === id ? { ...t, status } : t)));
  };

  const tabs = [
    { key: "ALL",      label: "All",      n: visibleToUser.length },
    { key: "PENDING",  label: "Pending",  n: pendingCount },
    { key: "APPROVED", label: "Approved", n: visibleToUser.filter((t) => t.status === "APPROVED").length },
    { key: "REJECTED", label: "Rejected", n: visibleToUser.filter((t) => t.status === "REJECTED").length },
  ];

  return (
    <>
      {/* Governance banner */}
      {canApprove && pendingCount > 0 && (
        <div className="alert-warning mb-4">
          <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold">{pendingCount} pending {pendingCount === 1 ? "transaction" : "transactions"} need your decision.</div>
            <div className="text-xs opacity-80 mt-0.5">
              Separation of duties: you cannot approve transactions you initiated yourself.
            </div>
          </div>
        </div>
      )}

      {/* Top action bar */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-slate-500">
          {isStorekeeper ? "Your stock requests" : "All stock movements — every action audited"}
        </div>
        {canCreate && (
          <button className="btn-primary">
            <Plus className="h-4 w-4" /> New transaction
          </button>
        )}
      </div>

      <section className="card overflow-hidden">
        {/* Filter tabs */}
        <div className="flex items-center px-5 py-3 border-b border-slate-100">
          <nav className="flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === t.key
                    ? "bg-brand-50 text-brand-700 ring-1 ring-brand-100"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t.label}
                <span className="ml-1.5 text-[10px] font-semibold text-slate-400">{t.n}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="overflow-x-auto scroll-area">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>Type</th>
                <th>Qty</th>
                <th>From</th>
                <th>To</th>
                <th>Requested by</th>
                <th>Status</th>
                <th>Date</th>
                {canApprove && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td className="text-slate-400 font-mono text-xs">#{t.id}</td>
                  <td className="font-medium text-slate-900">{t.product}</td>
                  <td><span className={`badge ${TYPE_BADGE[t.type]}`}>{t.type}</span></td>
                  <td className="font-semibold">{t.qty}</td>
                  <td className="text-slate-500">{t.from}</td>
                  <td className="text-slate-500">{t.to}</td>
                  <td>{t.user}</td>
                  <td><span className={STATUS_BADGE[t.status]}>{t.status}</span></td>
                  <td className="text-slate-500">{t.date}</td>
                  {canApprove && (
                    <td className="text-right">
                      {t.status === "PENDING" ? (
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setStatus(t.id, "APPROVED")}
                            className="btn-success btn-sm">
                            <Check className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button onClick={() => setStatus(t.id, "REJECTED")}
                            className="btn-danger btn-sm">
                            <X className="h-3.5 w-3.5" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={canApprove ? 10 : 9} className="py-12 text-center text-slate-500">
                    No transactions in this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

import { useEffect, useState } from "react";
import { Plus, Check, X, ShieldCheck, Loader2 } from "lucide-react";
import {
  getUser,
  transactions as txApi,
  products as productsApi,
} from "../lib/api";

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

const TYPE_OPTIONS = [
  { value: "IN",         label: "Stock In",        hint: "Add stock to a branch (e.g. from supplier)" },
  { value: "OUT",        label: "Stock Out",       hint: "Remove stock from a branch (e.g. sale, usage)" },
  { value: "TRANSFER",   label: "Transfer",        hint: "Move stock between branches" },
  { value: "ADJUSTMENT", label: "Adjustment",      hint: "Manual correction to absolute quantity" },
];

export default function Transactions() {
  const user = getUser();
  const role = user?.role;
  const canApprove = ["OWNER", "MANAGER"].includes(role);
  const canCreate = ["OWNER", "MANAGER", "STOREKEEPER"].includes(role);
  const isStorekeeper = role === "STOREKEEPER";

  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [productList, setProductList] = useState([]);

  // Modal state
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [draft, setDraft] = useState({
    type: "IN",
    product_id: "",
    requested_quantity: "",
    from_branch_id: "",
    to_branch_id: user?.branch_id || 1,
    notes: "",
  });

  const refresh = () => {
    txApi
      .list()
      .then((data) => setItems(data && data.length ? data : SEED))
      .catch(() => setItems(SEED));
  };

  useEffect(() => {
    refresh();
    productsApi.list()
      .then((data) => setProductList(data || []))
      .catch(() => setProductList([]));
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

  const submitTransaction = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!draft.product_id) return setFormError("Please choose a product.");
    if (!draft.requested_quantity || Number(draft.requested_quantity) <= 0) {
      return setFormError("Quantity must be greater than zero.");
    }
    setSaving(true);
    try {
      const payload = {
        type: draft.type,
        product_id: Number(draft.product_id),
        requested_quantity: Number(draft.requested_quantity),
        notes: draft.notes || null,
      };
      if (draft.type === "IN" || draft.type === "TRANSFER" || draft.type === "ADJUSTMENT") {
        if (draft.to_branch_id) payload.to_branch_id = Number(draft.to_branch_id);
      }
      if (draft.type === "OUT" || draft.type === "TRANSFER") {
        if (draft.from_branch_id) payload.from_branch_id = Number(draft.from_branch_id);
      }
      await txApi.create(payload);
      // close + refresh
      setOpen(false);
      setDraft({
        type: "IN",
        product_id: "",
        requested_quantity: "",
        from_branch_id: "",
        to_branch_id: user?.branch_id || 1,
        notes: "",
      });
      refresh();
    } catch (err) {
      setFormError(err.response?.data?.detail || "Failed to create transaction.");
    } finally {
      setSaving(false);
    }
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
          <button onClick={() => setOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> New transaction
          </button>
        )}
      </div>

      <section className="card overflow-hidden">
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

      {open && (
        <div className="modal-backdrop">
          <div className="card anim-scale-in w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">New transaction</h3>
              <button onClick={() => setOpen(false)} className="btn-ghost h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submitTransaction} className="space-y-3">
              <div>
                <label className="label">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {TYPE_OPTIONS.map((opt) => (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => setDraft({ ...draft, type: opt.value })}
                      className={`text-left rounded-lg border px-3 py-2 transition-all ${
                        draft.type === opt.value
                          ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="text-sm font-semibold text-slate-900">{opt.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{opt.hint}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Product</label>
                <select
                  className="input"
                  required
                  value={draft.product_id}
                  onChange={(e) => setDraft({ ...draft, product_id: e.target.value })}
                >
                  <option value="">— Select a product —</option>
                  {productList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.name}
                    </option>
                  ))}
                </select>
                {productList.length === 0 && (
                  <p className="mt-1 text-[11px] text-amber-600">
                    No products loaded. If this persists, the backend may be sleeping (Render free tier).
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Quantity</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    required
                    value={draft.requested_quantity}
                    onChange={(e) => setDraft({ ...draft, requested_quantity: e.target.value })}
                    placeholder="e.g. 200"
                  />
                </div>
                {(draft.type === "IN" || draft.type === "TRANSFER" || draft.type === "ADJUSTMENT") && (
                  <div>
                    <label className="label">
                      {draft.type === "ADJUSTMENT" ? "Branch" : "To branch"}
                    </label>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      value={draft.to_branch_id}
                      onChange={(e) => setDraft({ ...draft, to_branch_id: e.target.value })}
                      placeholder="1"
                    />
                  </div>
                )}
                {(draft.type === "OUT" || draft.type === "TRANSFER") && (
                  <div>
                    <label className="label">From branch</label>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      value={draft.from_branch_id}
                      onChange={(e) => setDraft({ ...draft, from_branch_id: e.target.value })}
                      placeholder="1"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="label">Notes (optional)</label>
                <textarea
                  className="input min-h-[60px]"
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  placeholder="Supplier, reason, reference number…"
                />
              </div>

              {formError && (
                <div className="alert-danger py-2.5 text-xs">{formError}</div>
              )}

              <div className="alert-info py-2.5 text-xs">
                <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div>
                  This transaction will be created with status <b>PENDING</b>. A Manager or
                  Owner (other than you) must approve it before stock levels change.
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                  ) : (
                    "Submit transaction"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

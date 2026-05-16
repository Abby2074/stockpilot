import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Filter,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { audit as auditApi } from "../lib/api";

const ACTION_BADGE = {
  CREATE:      "badge bg-emerald-950 text-emerald-300 ring-emerald-800",
  UPDATE:      "badge bg-accent-950 text-accent-300 ring-accent-800",
  DEACTIVATE:  "badge bg-amber-950 text-amber-300 ring-amber-800",
  DELETE:      "badge bg-red-950 text-red-300 ring-red-800",
  INITIATE:    "badge bg-accent-950 text-accent-300 ring-accent-800",
  APPROVE:     "badge bg-emerald-950 text-emerald-300 ring-emerald-800",
  REJECT:      "badge bg-red-950 text-red-300 ring-red-800",
};

function badgeFor(action) {
  return ACTION_BADGE[action] || "badge bg-slate-900 text-slate-300 ring-slate-700";
}

function formatTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString();
}

function JsonDiff({ before, after }) {
  if (!before && !after) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
      <div className="card p-3">
        <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Before</div>
        <pre className="text-[11px] text-slate-700 whitespace-pre-wrap break-all">
          {before ? JSON.stringify(before, null, 2) : "—"}
        </pre>
      </div>
      <div className="card p-3">
        <div className="text-[10px] uppercase tracking-wide text-brand-700 mb-1">After</div>
        <pre className="text-[11px] text-slate-700 whitespace-pre-wrap break-all">
          {after ? JSON.stringify(after, null, 2) : "—"}
        </pre>
      </div>
    </div>
  );
}

export default function AuditLog() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState({ entity_type: "", action: "" });
  const [expanded, setExpanded] = useState(null);

  const fetchRows = () => {
    setLoading(true);
    setError("");
    const params = {};
    if (filter.entity_type) params.entity_type = filter.entity_type;
    if (filter.action) params.action = filter.action;
    auditApi
      .list(params)
      .then(setRows)
      .catch((e) => {
        setError(e.response?.data?.detail || "Failed to load audit log");
        setRows([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(fetchRows, [filter]);

  const entityTypes = useMemo(() => {
    const set = new Set(rows.map((r) => r.entity_type).filter(Boolean));
    return ["", ...Array.from(set).sort()];
  }, [rows]);
  const actions = useMemo(() => {
    const set = new Set(rows.map((r) => r.action).filter(Boolean));
    return ["", ...Array.from(set).sort()];
  }, [rows]);

  return (
    <>
      <div className="alert-info mb-4">
        <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <div className="font-semibold">Immutable audit trail</div>
          <div className="text-xs opacity-90 mt-0.5">
            Every create, update, approve and reject is recorded here with the acting user,
            timestamp, and before/after snapshot. This log cannot be edited.
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-slate-400" />
        <select
          className="input max-w-[180px]"
          value={filter.entity_type}
          onChange={(e) => setFilter((f) => ({ ...f, entity_type: e.target.value }))}
        >
          <option value="">All entities</option>
          {entityTypes.filter(Boolean).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          className="input max-w-[180px]"
          value={filter.action}
          onChange={(e) => setFilter((f) => ({ ...f, action: e.target.value }))}
        >
          <option value="">All actions</option>
          {actions.filter(Boolean).map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <div className="ml-auto text-xs text-slate-500">
          {loading ? "Loading…" : `${rows.length} entries`}
        </div>
      </div>

      {error && <div className="alert-danger mb-4">{error}</div>}

      <section className="card overflow-hidden">
        <div className="overflow-x-auto scroll-area">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th>#</th>
                <th>When</th>
                <th>User</th>
                <th>Entity</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="inline h-5 w-5 animate-spin" />
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <FileText className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                    No audit entries yet. Take an action (e.g. add a product) and it will appear here.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const isOpen = expanded === r.id;
                return (
                  <>
                    <tr
                      key={r.id}
                      className="cursor-pointer"
                      onClick={() => setExpanded(isOpen ? null : r.id)}
                    >
                      <td>
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        )}
                      </td>
                      <td className="font-mono text-xs text-slate-400">#{r.id}</td>
                      <td className="text-slate-600">{formatTime(r.created_at)}</td>
                      <td>
                        <div className="font-medium text-slate-900">{r.user_name || "—"}</div>
                        <div className="text-[10px] text-slate-500">{r.user_email}</div>
                      </td>
                      <td>
                        <span className="badge bg-slate-900 text-slate-300 ring-slate-700">
                          {r.entity_type}
                        </span>
                        <span className="ml-2 font-mono text-xs text-slate-400">#{r.entity_id}</span>
                      </td>
                      <td>
                        <span className={badgeFor(r.action)}>{r.action}</span>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${r.id}-detail`}>
                        <td colSpan={6} className="bg-brand-50/30 py-3">
                          <JsonDiff before={r.before_data} after={r.after_data} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

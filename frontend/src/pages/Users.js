import { useEffect, useState } from "react";
import {
  UserPlus,
  Mail,
  Lock,
  ShieldCheck,
  ShieldAlert,
  X,
  Loader2,
  UserX,
  UserCheck,
} from "lucide-react";
import { users as usersApi, getUser } from "../lib/api";

const ROLES = ["OWNER", "MANAGER", "STOREKEEPER", "SALES"];

const ROLE_BADGE = {
  OWNER:       "bg-brand-950   text-brand-300   ring-brand-800",
  MANAGER:     "bg-accent-950  text-accent-300  ring-accent-800",
  STOREKEEPER: "bg-amber-950   text-amber-300   ring-amber-800",
  SALES:       "bg-slate-900   text-slate-300   ring-slate-700",
};

export default function Users() {
  const me = getUser();
  const isOwner = me?.role === "OWNER";

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    name: "", email: "", password: "", role: "STOREKEEPER",
    branch_id: me?.branch_id ?? 1,
  });

  const refresh = () => {
    setLoading(true);
    usersApi
      .list()
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  const handleDeactivate = async (u) => {
    if (!window.confirm(
      `Deactivate ${u.name} (${u.email})? Their account will be set to INACTIVE and they will no longer be able to log in. This is reversible.`
    )) return;
    try {
      await usersApi.deactivate(u.id);
      refresh();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to deactivate user.");
    }
  };

  const handleReactivate = async (u) => {
    try {
      await usersApi.reactivate(u.id);
      refresh();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to reactivate user.");
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await usersApi.create(draft);
      setDraft({ name: "", email: "", password: "", role: "STOREKEEPER",
                 branch_id: me?.branch_id ?? 1 });
      setOpen(false);
      refresh();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  if (!isOwner) {
    return (
      <div className="card p-8 max-w-md mx-auto text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-slate-300" />
        <h2 className="mt-3 text-lg font-semibold text-slate-900">Owner access only</h2>
        <p className="mt-1 text-sm text-slate-500">
          User management is restricted to the Owner role to preserve the
          audit-trail accountability of StockPilot.
        </p>
      </div>
    );
  }

  // role counts for the header strip
  const counts = ROLES.reduce((acc, r) => ({ ...acc, [r]: list.filter((u) => u.role === r).length }), {});

  return (
    <>
      {/* Role-count strip */}
      <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {ROLES.map((r) => (
          <div key={r} className="card p-4 flex items-center justify-between">
            <span className={`badge ${ROLE_BADGE[r]}`}>{r}</span>
            <span className="text-xl font-semibold text-slate-900">{counts[r] || 0}</span>
          </div>
        ))}
      </div>

      {/* Top bar */}
      <div className="mb-4 flex items-center justify-between">
        <div className="alert-info py-2.5 flex-1 max-w-2xl mr-4">
          <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
          <div className="text-xs">
            Every user create / update / deactivate is recorded in the audit log with timestamp and acting Owner.
          </div>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary">
          <UserPlus className="h-4 w-4" /> Add user
        </button>
      </div>

      <section className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            {loading ? "Loading…" : `${list.length} user${list.length === 1 ? "" : "s"}`}
          </div>
        </div>
        <div className="overflow-x-auto scroll-area">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Branch</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((u) => {
                const isActive = (u.status || "active").toLowerCase() === "active";
                const isSelf = u.id === me?.id;
                return (
                  <tr key={u.id}>
                    <td className="text-slate-400 font-mono text-xs">#{u.id}</td>
                    <td className="font-medium text-slate-900">{u.name}</td>
                    <td className="text-slate-600">{u.email}</td>
                    <td>
                      <span className={`badge ${ROLE_BADGE[u.role] || "badge-info"}`}>{u.role}</span>
                    </td>
                    <td className="text-slate-500">{u.branch_id ?? "—"}</td>
                    <td>
                      <span className={isActive ? "badge-approved" : "badge-rejected"}>
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="text-right whitespace-nowrap">
                      {isSelf ? (
                        <span className="text-xs text-slate-400 italic">you</span>
                      ) : isActive ? (
                        <button
                          onClick={() => handleDeactivate(u)}
                          className="btn-danger btn-sm"
                          title="Deactivate user"
                        >
                          <UserX className="h-3.5 w-3.5" /> Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(u)}
                          className="btn-success btn-sm"
                          title="Reactivate user"
                        >
                          <UserCheck className="h-3.5 w-3.5" /> Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loading && list.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No users yet. Click <span className="font-medium">Add user</span> to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {open && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 p-4">
          <div className="card w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Create new user</h3>
              <button onClick={() => setOpen(false)} className="btn-ghost h-8 w-8 p-0"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <label className="label">Full name</label>
                <input className="input" required value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Kwame Asante" />
              </div>

              <div>
                <label className="label">Email address</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input className="input pl-9" type="email" required value={draft.email}
                    onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                    placeholder="user@example.com" />
                </div>
              </div>

              <div>
                <label className="label">Temporary password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input className="input pl-9" type="text" required minLength={6} value={draft.password}
                    onChange={(e) => setDraft({ ...draft, password: e.target.value })}
                    placeholder="At least 6 characters" />
                </div>
                <p className="mt-1 text-xs text-slate-500">The user should change this on first login.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Role</label>
                  <select className="input" value={draft.role}
                    onChange={(e) => setDraft({ ...draft, role: e.target.value })}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Branch ID</label>
                  <input className="input" type="number" min={1} value={draft.branch_id ?? 1}
                    onChange={(e) => setDraft({ ...draft, branch_id: Number(e.target.value) || null })} />
                </div>
              </div>

              {error && <div className="alert-danger py-2">{error}</div>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? (<><Loader2 className="h-4 w-4 animate-spin" /> Creating…</>) : "Create user"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  ArrowRightLeft,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  ScanLine,
  ShoppingCart,
  PackageSearch,
  ClipboardList,
  ShieldCheck,
  Bot,
  Bell,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { getUser } from "../lib/api";

// Stat tile definitions per role.
const STATS_BY_ROLE = {
  OWNER: [
    { label: "Total Products",     key: "products", Icon: Package,        tone: "brand" },
    { label: "Stock Transactions", key: "tx",       Icon: ArrowRightLeft, tone: "accent" },
    { label: "Pending Approvals",  key: "pending",  Icon: Clock,          tone: "amber" },
    { label: "Approved Today",     key: "approved", Icon: CheckCircle2,   tone: "emerald" },
  ],
  MANAGER: [
    { label: "Total Products",     key: "products", Icon: Package,        tone: "brand" },
    { label: "Stock Transactions", key: "tx",       Icon: ArrowRightLeft, tone: "accent" },
    { label: "Pending Approvals",  key: "pending",  Icon: Clock,          tone: "amber" },
    { label: "Approved Today",     key: "approved", Icon: CheckCircle2,   tone: "emerald" },
  ],
  STOREKEEPER: [
    { label: "Total Products",      key: "products",   Icon: Package,        tone: "brand" },
    { label: "Transactions Today",  key: "tx_today",   Icon: ArrowRightLeft, tone: "accent" },
    { label: "My Pending Requests", key: "my_pending", Icon: Clock,          tone: "amber" },
    { label: "Active AI Sessions",  key: "ai_active",  Icon: ScanLine,       tone: "emerald" },
  ],
  SALES: [
    { label: "Total Products",  key: "products",    Icon: Package,         tone: "brand" },
    { label: "Low-Stock Items", key: "low_stock",   Icon: AlertTriangle,   tone: "amber" },
    { label: "Sales Today",     key: "sales_today", Icon: ShoppingCart,    tone: "emerald" },
    { label: "Recent Enquiries",key: "enquiries",   Icon: PackageSearch,   tone: "accent" },
  ],
};

const COUNTS_BY_ROLE = {
  OWNER:       { products: 54, tx: 412, pending: 7, approved: 23 },
  MANAGER:     { products: 54, tx: 412, pending: 7, approved: 23 },
  STOREKEEPER: { products: 54, tx_today: 6, my_pending: 3, ai_active: 1 },
  SALES:       { products: 54, low_stock: 4, sales_today: 12, enquiries: 8 },
};

const TONE_CLASS = {
  brand:   "bg-brand-50 text-brand-700",
  accent:  "bg-accent-50 text-accent-700",
  amber:   "bg-amber-50 text-amber-700",
  emerald: "bg-emerald-50 text-emerald-700",
};

const SERIES = [
  { day: "Mon", count: 32 },
  { day: "Tue", count: 41 },
  { day: "Wed", count: 38 },
  { day: "Thu", count: 56 },
  { day: "Fri", count: 49 },
  { day: "Sat", count: 22 },
  { day: "Sun", count: 14 },
];

const RECENT = [
  { product: "Portland cement 50kg",       type: "IN",         qty: 320,  status: "APPROVED", date: "2026-05-15" },
  { product: "Iron rod 12mm",              type: "OUT",        qty: 80,   status: "APPROVED", date: "2026-05-15" },
  { product: "Common wire nails 3″",       type: "IN",         qty: 150,  status: "APPROVED", date: "2026-05-15" },
  { product: "GI steel pipe 2 inch",       type: "TRANSFER",   qty: 60,   status: "PENDING",  date: "2026-05-14" },
  { product: "Sandcrete block 6″",         type: "IN",         qty: 1200, status: "APPROVED", date: "2026-05-14" },
  { product: "Aluminium roofing sheet 3m", type: "OUT",        qty: 45,   status: "APPROVED", date: "2026-05-14" },
  { product: "Iron rod 16mm",              type: "ADJUSTMENT", qty: -12,  status: "PENDING",  date: "2026-05-13" },
  { product: "Emulsion paint, white 20L",  type: "IN",         qty: 24,   status: "APPROVED", date: "2026-05-13" },
];

const TYPE_BADGE = {
  IN:         "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  OUT:        "bg-red-50 text-red-700 ring-1 ring-red-200",
  TRANSFER:   "bg-accent-50 text-accent-700 ring-1 ring-accent-200",
  ADJUSTMENT: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  COUNT:      "bg-brand-50 text-brand-700 ring-1 ring-brand-200",
};

function statusBadge(s) {
  if (s === "APPROVED") return "badge-approved";
  if (s === "REJECTED") return "badge-rejected";
  return "badge-pending";
}

export default function Dashboard() {
  const user = getUser() || {};
  const role = (user.role || "OWNER").toUpperCase();
  const stats  = STATS_BY_ROLE[role]  || STATS_BY_ROLE.OWNER;
  const counts = COUNTS_BY_ROLE[role] || COUNTS_BY_ROLE.OWNER;

  const isApprover = role === "OWNER" || role === "MANAGER";
  const isSales    = role === "SALES";

  useEffect(() => {}, []);

  return (
    <>
      {/* Welcome strip */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">Welcome back</div>
          <div className="text-xl font-semibold text-slate-900">{user.name || "User"}</div>
        </div>
        <span className="badge-info">
          <TrendingUp className="h-3.5 w-3.5" /> +12% week-on-week
        </span>
      </div>

      {/* Stat tiles */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, key, Icon, tone }) => (
          <div key={key} className="stat-tile card-hover">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${TONE_CLASS[tone]}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="stat-label">{label}</div>
              <div className="stat-value mt-1">{counts[key]}</div>
            </div>
          </div>
        ))}
      </section>

      {/* Chart + role panel */}
      <section className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {isSales ? "Items moving — last 7 days" : "Stock activity — last 7 days"}
              </h2>
              <p className="text-xs text-slate-500">
                {isApprover && "Approved transactions per day"}
                {role === "STOREKEEPER" && "Transactions you initiated per day"}
                {isSales && "Outgoing stock per day"}
              </p>
            </div>
            <span className="badge bg-accent-50 text-accent-700 ring-1 ring-accent-100">
              Live · 7d
            </span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={SERIES} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gBrand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0d9488" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="#0d9488" strokeWidth={2.5} fill="url(#gBrand)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {isApprover && <ApproverActionPanel />}
        {role === "STOREKEEPER" && <StorekeeperWorkPanel />}
        {isSales && <SalesQuickPanel />}
      </section>

      {/* Capabilities feature strip — the 21st.dev "features" pattern */}
      <section className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <FeatureTile
          tone="brand"
          Icon={ShieldCheck}
          title="Role-based access"
          body="Four roles, separation of duties enforced on every endpoint, full audit trail."
        />
        <FeatureTile
          tone="accent"
          Icon={Bot}
          title="AI-assisted counting"
          body="Capture stock with your phone or CCTV; the AI service returns counts with confidence scores."
        />
        <FeatureTile
          tone="brand"
          Icon={Bell}
          title="Role-targeted alerts"
          body="Approvals to managers, AI completions to storekeepers, discrepancies to owners."
        />
      </section>

      {/* Recent transactions */}
      <section className="mt-6 card overflow-hidden">
        <div className="flex items-center justify-between p-5">
          <h2 className="text-base font-semibold text-slate-900">
            {isApprover && "Recent transactions"}
            {role === "STOREKEEPER" && "Your recent submissions"}
            {isSales && "Latest stock movements"}
          </h2>
          <Link to="/transactions" className="btn-ghost btn-sm">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filterRecentForRole(RECENT, role).map((r, i) => (
                <tr key={i}>
                  <td className="font-medium text-slate-900">{r.product}</td>
                  <td><span className={`badge ${TYPE_BADGE[r.type]}`}>{r.type}</span></td>
                  <td>{r.qty}</td>
                  <td><span className={statusBadge(r.status)}>{r.status}</span></td>
                  <td className="text-slate-500">{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function FeatureTile({ tone, Icon, title, body }) {
  const iconClass = tone === "accent" ? "stat-tile-icon-accent" : "stat-tile-icon";
  return (
    <div className="card card-hover p-5">
      <div className={iconClass}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-3 text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-xs text-slate-500 leading-relaxed">{body}</div>
    </div>
  );
}

function ApproverActionPanel() {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <h2 className="text-base font-semibold text-slate-900">Awaiting your action</h2>
      </div>
      <ul className="space-y-3 text-sm">
        <li className="flex items-center justify-between"><span className="text-slate-600">Stock-in approvals</span><span className="font-semibold text-slate-900">4</span></li>
        <li className="flex items-center justify-between"><span className="text-slate-600">Stock adjustments</span><span className="font-semibold text-slate-900">2</span></li>
        <li className="flex items-center justify-between"><span className="text-slate-600">Transfer requests</span><span className="font-semibold text-slate-900">1</span></li>
        <li className="flex items-center justify-between"><span className="text-slate-600">AI count reviews</span><span className="font-semibold text-slate-900">2</span></li>
      </ul>
      <Link to="/transactions" className="btn-primary w-full mt-4">Review pending</Link>
    </div>
  );
}

function StorekeeperWorkPanel() {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-3">
        <ClipboardList className="h-4 w-4 text-brand-700" />
        <h2 className="text-base font-semibold text-slate-900">Your open work</h2>
      </div>
      <ul className="space-y-3 text-sm">
        <li className="flex items-center justify-between"><span className="text-slate-600">Pending manager approval</span><span className="font-semibold text-slate-900">3</span></li>
        <li className="flex items-center justify-between"><span className="text-slate-600">AI sessions in progress</span><span className="font-semibold text-slate-900">1</span></li>
        <li className="flex items-center justify-between"><span className="text-slate-600">Returned for clarification</span><span className="font-semibold text-slate-900">0</span></li>
      </ul>
      <div className="mt-4 space-y-2">
        <Link to="/transactions" className="btn-primary w-full">New stock request</Link>
        <Link to="/ai-count" className="btn-secondary w-full"><ScanLine className="h-4 w-4" /> Start AI count</Link>
      </div>
    </div>
  );
}

function SalesQuickPanel() {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-3">
        <ShoppingCart className="h-4 w-4 text-brand-700" />
        <h2 className="text-base font-semibold text-slate-900">Quick actions</h2>
      </div>
      <ul className="space-y-3 text-sm">
        <li className="flex items-center justify-between"><span className="text-slate-600">Low-stock items today</span><span className="font-semibold text-slate-900">4</span></li>
        <li className="flex items-center justify-between"><span className="text-slate-600">Customer enquiries</span><span className="font-semibold text-slate-900">8</span></li>
      </ul>
      <Link to="/products" className="btn-primary w-full mt-4">Check stock availability</Link>
    </div>
  );
}

function filterRecentForRole(rows, role) {
  if (role === "STOREKEEPER") return rows.filter((r) => ["IN", "ADJUSTMENT"].includes(r.type));
  if (role === "SALES") return rows.filter((r) => r.type === "OUT");
  return rows;
}

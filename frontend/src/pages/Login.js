import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Boxes, Scan, ShieldCheck, Loader2, Mail, Lock } from "lucide-react";
import { auth } from "../lib/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await auth.login(email, password);
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* LEFT — brand panel */}
      <aside className="hidden md:flex flex-col justify-between bg-gradient-to-br from-brand-700 via-brand-600 to-brand-900 text-white p-12 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <Boxes className="h-7 w-7" />
            <span className="text-xl font-semibold tracking-tight">StockPilot</span>
          </div>
          <p className="mt-2 text-sm text-brand-100/80">
            AI-integrated, role-based inventory management
          </p>
        </div>

        <div className="relative z-10 space-y-8">
          <h2 className="text-3xl font-semibold leading-tight max-w-md">
            Count smarter.
            <br />
            Approve safely.
            <br />
            Trace everything.
          </h2>
          <div className="space-y-4 max-w-md">
            <Feature
              icon={<Scan className="h-5 w-5" />}
              title="Computer-vision stock counting"
              body="Capture stock with your phone or CCTV; YOLOv8 returns counts with confidence scores."
            />
            <Feature
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Role-based governance"
              body="Owner, Manager, Storekeeper and Sales Staff each see only what their role permits."
            />
          </div>
        </div>

        <div className="relative z-10 text-xs text-brand-100/60">
          © 2026 StockPilot. Built for Ghanaian SMEs.
        </div>

        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -left-20 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl" />
      </aside>

      {/* RIGHT — form */}
      <main className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="md:hidden mb-8 flex items-center gap-2 text-brand-700">
            <Boxes className="h-6 w-6" />
            <span className="text-lg font-semibold">StockPilot</span>
          </div>

          <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to manage your inventory.
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="label">Email address</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input pl-9"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="label">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pl-9"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Protected by JWT authentication · audit-traceable access
          </p>
        </div>
      </main>
    </div>
  );
}

function Feature({ icon, title, body }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
        {icon}
      </div>
      <div>
        <div className="font-medium">{title}</div>
        <p className="text-sm text-brand-100/80">{body}</p>
      </div>
    </div>
  );
}

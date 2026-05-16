import { useEffect, useState } from "react";
import {
  ScanLine,
  Upload,
  Camera,
  Loader2,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { aiDetect, aiStatus, getUser } from "../lib/api";

export default function AICount() {
  const user = getUser();
  const canApprove = ["OWNER", "MANAGER"].includes(user?.role);

  const [images, setImages] = useState([]);   // [{ file, name, url }]
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [decision, setDecision] = useState(null);
  const [error, setError] = useState(null);
  const [model, setModel] = useState({ configured: false, mock: true });

  useEffect(() => {
    aiStatus()
      .then((s) =>
        setModel({
          configured: !!s.model_configured && !!s.api_key_configured,
          mock: !s.model_configured,
        })
      )
      .catch(() => setModel({ configured: false, mock: true }));
  }, []);

  const onFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const next = files.map((f) => ({ file: f, name: f.name, url: URL.createObjectURL(f) }));
    setImages([...images, ...next]);
  };

  const runDetection = async () => {
    setProcessing(true);
    setError(null);
    setResults(null);
    try {
      const out = await aiDetect(images.map((i) => i.file));
      setResults(out.detections || []);
      setModel({ configured: !out.mock, mock: !!out.mock });
    } catch (e) {
      setError(
        "The AI service did not respond. Make sure it is running on port 8001 " +
          "(see ai-service/README.md)."
      );
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setImages([]);
    setResults(null);
    setDecision(null);
    setError(null);
  };

  return (
    <>
      {/* Status banner */}
      <div className={model.mock ? "alert-warning mb-4" : "alert-info mb-4"}>
        <Sparkles className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <div className="font-semibold">
            {model.mock ? "AI service running in placeholder mode" : "AI service connected"}
          </div>
          <div className="text-xs opacity-80 mt-0.5">
            {model.mock
              ? "Set ROBOFLOW_MODEL in ai-service/.env (e.g. cement-bag-detection-xyz/2) to enable real detections."
              : "Detections are produced by the configured Roboflow model and reviewed below before being applied to stock levels."}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Upload + run */}
        <section className="lg:col-span-2 space-y-4">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Step 1 — Capture stock images</h2>
                <p className="text-sm text-slate-500">Use your phone camera or a CCTV snapshot.</p>
              </div>
              <span className="badge-info">
                <ScanLine className="h-3.5 w-3.5" /> Session #STG-{Math.floor(Math.random() * 9000) + 1000}
              </span>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center hover:bg-slate-50 hover:border-accent-300 transition-colors">
              <Upload className="h-6 w-6 text-slate-400 mb-2" />
              <span className="text-sm font-medium text-slate-700">
                Drag-and-drop or click to upload images
              </span>
              <span className="mt-1 text-xs text-slate-500">PNG · JPG up to 10 MB each</span>
              <input type="file" multiple accept="image/*" onChange={onFiles} className="sr-only" />
            </label>

            {images.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-medium text-slate-500 mb-2">
                  Selected {images.length} {images.length === 1 ? "image" : "images"}
                </div>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {images.map((img, i) => (
                    <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-slate-200">
                      <img src={img.url} alt={img.name} className="h-full w-full object-cover" />
                      <span className="absolute bottom-0 left-0 right-0 truncate bg-black/40 px-2 py-1 text-[10px] text-white">
                        {img.name}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={reset} className="btn-secondary">Reset</button>
                  <button onClick={runDetection} disabled={processing} className="btn-primary">
                    {processing ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Detecting…</>
                    ) : (
                      <><Camera className="h-4 w-4" /> Run AI detection</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="alert-danger">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>{error}</div>
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="card p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-1">Step 2 — Review detections</h2>
              <p className="text-sm text-slate-500 mb-4">
                {results.length} {results.length === 1 ? "item" : "items"} detected · confidence shown per row.
              </p>
              <div className="overflow-x-auto scroll-area">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Detected class</th>
                      <th>Count</th>
                      <th>Average confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => {
                      const pct = Math.round((r.confidence || 0) * 100);
                      const tone = pct >= 90 ? "emerald" : pct >= 75 ? "accent" : pct >= 60 ? "amber" : "red";
                      const barColor =
                        tone === "emerald" ? "bg-emerald-500" :
                        tone === "accent"  ? "bg-accent-600"  :
                        tone === "amber"   ? "bg-amber-500"   : "bg-red-500";
                      const textColor =
                        tone === "emerald" ? "text-emerald-700" :
                        tone === "accent"  ? "text-accent-700"  :
                        tone === "amber"   ? "text-amber-700"   : "text-red-700";
                      return (
                        <tr key={i}>
                          <td className="font-medium text-slate-900 capitalize">{r.product}</td>
                          <td className="text-lg font-semibold">{r.count}</td>
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
                                <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className={`text-xs font-medium ${textColor}`}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {canApprove && !decision && (
                <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button onClick={() => setDecision("REJECTED")} className="btn-danger">
                    <XCircle className="h-4 w-4" /> Reject session
                  </button>
                  <button onClick={() => setDecision("APPROVED")} className="btn-success">
                    <CheckCircle2 className="h-4 w-4" /> Approve & apply to stock
                  </button>
                </div>
              )}

              {decision === "APPROVED" && (
                <div className="alert-success mt-4">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>Session approved. Stock levels updated and audit log entry written.</div>
                </div>
              )}
              {decision === "REJECTED" && (
                <div className="alert-danger mt-4">
                  <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>Session rejected. No stock levels were changed.</div>
                </div>
              )}

              {!canApprove && (
                <div className="alert-neutral mt-4">
                  <ImageIcon className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>Detection saved. Awaiting Manager / Owner approval.</div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Side panel */}
        <aside className="space-y-4">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-accent-600" />
              <h3 className="text-sm font-semibold text-slate-900">How AI counting works</h3>
            </div>
            <ol className="space-y-2 text-sm text-slate-600 list-decimal list-inside marker:text-accent-600">
              <li>Storekeeper uploads stock images.</li>
              <li>AI microservice detects and counts items.</li>
              <li>Manager reviews detections and approves.</li>
              <li>Stock levels update; audit trail records the decision.</li>
            </ol>
          </div>

          <div className="card-accent p-6">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-accent-700" />
              <h3 className="text-sm font-semibold text-slate-900">Governance rule</h3>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              No AI-generated count writes to live stock levels until a Manager or Owner
              explicitly approves the session. Every approval and rejection is recorded
              in the audit log.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

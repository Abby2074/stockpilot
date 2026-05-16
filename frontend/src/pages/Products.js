import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, X, Filter } from "lucide-react";
import { getUser, products as productsApi } from "../lib/api";

const SEED = [
  { id: 1,  sku: "CEM-PRT-50",   name: "Portland cement 50kg",         category: "Cement",      unit: "bag",    status: "active" },
  { id: 2,  sku: "CEM-PRT-42",   name: "Portland cement 42.5kg",       category: "Cement",      unit: "bag",    status: "active" },
  { id: 3,  sku: "CEM-WHT-25",   name: "White cement 25kg",            category: "Cement",      unit: "bag",    status: "active" },
  { id: 4,  sku: "CEM-RPD-50",   name: "Rapid-hardening cement 50kg",  category: "Cement",      unit: "bag",    status: "active" },
  { id: 5,  sku: "CEM-PRT-12",   name: "Portland cement 12.5kg pocket",category: "Cement",      unit: "bag",    status: "active" },
  { id: 6,  sku: "ROD-08MM",     name: "Iron rod 8mm",                 category: "Iron Rods",   unit: "piece",  status: "active" },
  { id: 7,  sku: "ROD-10MM",     name: "Iron rod 10mm",                category: "Iron Rods",   unit: "piece",  status: "active" },
  { id: 8,  sku: "ROD-12MM",     name: "Iron rod 12mm",                category: "Iron Rods",   unit: "piece",  status: "active" },
  { id: 9,  sku: "ROD-16MM",     name: "Iron rod 16mm",                category: "Iron Rods",   unit: "piece",  status: "active" },
  { id: 10, sku: "ROD-20MM",     name: "Iron rod 20mm",                category: "Iron Rods",   unit: "piece",  status: "active" },
  { id: 11, sku: "ROD-25MM",     name: "Iron rod 25mm",                category: "Iron Rods",   unit: "piece",  status: "active" },
  { id: 12, sku: "ROD-32MM",     name: "Iron rod 32mm",                category: "Iron Rods",   unit: "piece",  status: "active" },
  { id: 13, sku: "PIPE-GI-0.5",  name: "GI steel pipe ½ inch",         category: "Steel Pipes", unit: "metre",  status: "active" },
  { id: 14, sku: "PIPE-GI-0.75", name: "GI steel pipe ¾ inch",         category: "Steel Pipes", unit: "metre",  status: "active" },
  { id: 15, sku: "PIPE-GI-1",    name: "GI steel pipe 1 inch",         category: "Steel Pipes", unit: "metre",  status: "active" },
  { id: 16, sku: "PIPE-GI-1.5",  name: "GI steel pipe 1½ inch",        category: "Steel Pipes", unit: "metre",  status: "active" },
  { id: 17, sku: "PIPE-GI-2",    name: "GI steel pipe 2 inch",         category: "Steel Pipes", unit: "metre",  status: "active" },
  { id: 18, sku: "PIPE-GI-3",    name: "GI steel pipe 3 inch",         category: "Steel Pipes", unit: "metre",  status: "active" },
  { id: 19, sku: "PIPE-GI-4",    name: "GI steel pipe 4 inch",         category: "Steel Pipes", unit: "metre",  status: "active" },
  { id: 20, sku: "NAIL-CW-1",    name: "Common wire nails 1″",         category: "Nails",       unit: "kg",     status: "active" },
  { id: 21, sku: "NAIL-CW-2",    name: "Common wire nails 2″",         category: "Nails",       unit: "kg",     status: "active" },
  { id: 22, sku: "NAIL-CW-3",    name: "Common wire nails 3″",         category: "Nails",       unit: "kg",     status: "active" },
  { id: 23, sku: "NAIL-CW-4",    name: "Common wire nails 4″",         category: "Nails",       unit: "kg",     status: "active" },
  { id: 24, sku: "NAIL-CW-5",    name: "Common wire nails 5″",         category: "Nails",       unit: "kg",     status: "active" },
  { id: 25, sku: "NAIL-RF",      name: "Roofing nails (umbrella head)",category: "Nails",       unit: "kg",     status: "active" },
  { id: 26, sku: "NAIL-CN",      name: "Concrete (masonry) nails",     category: "Nails",       unit: "kg",     status: "active" },
  { id: 27, sku: "NAIL-FN",      name: "Finishing nails (panel pins)", category: "Nails",       unit: "kg",     status: "active" },
  { id: 28, sku: "BLK-SC-6",     name: "Sandcrete block 6″",           category: "Blocks",      unit: "piece",  status: "active" },
  { id: 29, sku: "BLK-SC-9",     name: "Sandcrete block 9″",           category: "Blocks",      unit: "piece",  status: "active" },
  { id: 30, sku: "BLK-SOL-6",    name: "Solid concrete block 6″",      category: "Blocks",      unit: "piece",  status: "active" },
  { id: 31, sku: "BLK-HW-6",     name: "Hollow concrete block 6″",     category: "Blocks",      unit: "piece",  status: "active" },
  { id: 32, sku: "BLK-INT",      name: "Interlocking pavement block",  category: "Blocks",      unit: "piece",  status: "active" },
  { id: 33, sku: "TILE-FL-60",   name: "Floor tile 60×60cm",           category: "Tiles",       unit: "box",    status: "active" },
  { id: 34, sku: "TILE-FL-40",   name: "Floor tile 40×40cm",           category: "Tiles",       unit: "box",    status: "active" },
  { id: 35, sku: "TILE-WL-30",   name: "Wall tile 30×60cm",            category: "Tiles",       unit: "box",    status: "active" },
  { id: 36, sku: "TILE-PORC",    name: "Porcelain tile 60×60cm",       category: "Tiles",       unit: "box",    status: "active" },
  { id: 37, sku: "ROOF-AL-3M",   name: "Aluminium roofing sheet 3m",   category: "Roofing",     unit: "sheet",  status: "active" },
  { id: 38, sku: "ROOF-AL-4M",   name: "Aluminium roofing sheet 4m",   category: "Roofing",     unit: "sheet",  status: "active" },
  { id: 39, sku: "ROOF-IBR",     name: "IBR profile sheet",            category: "Roofing",     unit: "sheet",  status: "active" },
  { id: 40, sku: "AGG-GRV-20",   name: "Crushed gravel 20mm",          category: "Aggregates",  unit: "ton",    status: "active" },
  { id: 41, sku: "AGG-SND-FN",   name: "Fine river sand",              category: "Aggregates",  unit: "ton",    status: "active" },
  { id: 42, sku: "AGG-SND-CR",   name: "Coarse pit sand",              category: "Aggregates",  unit: "ton",    status: "active" },
  { id: 43, sku: "PNT-EM-WHT",   name: "Emulsion paint, white 20L",    category: "Paint",       unit: "drum",   status: "active" },
  { id: 44, sku: "PNT-GLS-BLK",  name: "Gloss paint, black 4L",        category: "Paint",       unit: "tin",    status: "active" },
  { id: 45, sku: "PNT-PMR",      name: "Wall primer 20L",              category: "Paint",       unit: "drum",   status: "active" },
  { id: 46, sku: "PNT-POP",      name: "Plaster of Paris 25kg",        category: "Paint",       unit: "bag",    status: "active" },
  { id: 47, sku: "PVC-3IN",      name: "PVC drainage pipe 3 inch",     category: "Plumbing",    unit: "length", status: "active" },
  { id: 48, sku: "PVC-4IN",      name: "PVC drainage pipe 4 inch",     category: "Plumbing",    unit: "length", status: "active" },
  { id: 49, sku: "WIRE-2.5",     name: "Electrical wire 2.5mm² (roll)",category: "Electrical",  unit: "roll",   status: "active" },
  { id: 50, sku: "WIRE-BND",     name: "Binding wire (galvanised)",    category: "Electrical",  unit: "kg",     status: "active" },
  { id: 51, sku: "TMBR-2X4",     name: "Wawa timber 2″×4″ ×12ft",      category: "Timber",      unit: "piece",  status: "active" },
  { id: 52, sku: "TMBR-2X3",     name: "Wawa timber 2″×3″ ×12ft",      category: "Timber",      unit: "piece",  status: "active" },
  { id: 53, sku: "PLY-18",       name: "Plywood 18mm 4×8ft",           category: "Timber",      unit: "sheet",  status: "active" },
  { id: 54, sku: "PLY-12",       name: "Plywood 12mm 4×8ft",           category: "Timber",      unit: "sheet",  status: "active" },
];

export default function Products() {
  const user = getUser();
  const canManage = ["OWNER", "MANAGER"].includes(user?.role);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ sku: "", name: "", category: "", unit: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const openCreate = () => {
    setEditingId(null);
    setDraft({ sku: "", name: "", category: "", unit: "" });
    setFormError("");
    setOpen(true);
  };

  const openEdit = (p) => {
    setEditingId(p.id);
    setDraft({ sku: p.sku, name: p.name, category: p.category, unit: p.unit });
    setFormError("");
    setOpen(true);
  };

  useEffect(() => {
    let cancelled = false;
    productsApi
      .list()
      .then((data) => {
        if (cancelled) return;
        setItems(data && data.length ? data : SEED);
      })
      .catch(() => { if (!cancelled) setItems(SEED); })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category));
    return ["All", ...Array.from(set).sort()];
  }, [items]);

  const filtered = items.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "All" || p.category === category;
    return matchesSearch && matchesCategory;
  });

  const submitProduct = async (e) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      if (editingId) {
        const saved = await productsApi.update(editingId, draft);
        setItems(items.map((p) => (p.id === editingId ? { ...p, ...saved } : p)));
      } else {
        const saved = await productsApi.create(draft);
        setItems([saved, ...items]);
      }
      setDraft({ sku: "", name: "", category: "", unit: "" });
      setEditingId(null);
      setOpen(false);
    } catch (err) {
      setFormError(err.response?.data?.detail || "Failed to save product.");
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async (id) => {
    try { await productsApi.remove(id); } catch {}
    setItems(items.filter((p) => p.id !== id));
  };

  return (
    <>
      {/* Top action bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="text-sm text-slate-500">
          {loading ? "Loading…" : `${filtered.length} of ${items.length} products`}
        </div>
        {canManage && (
          <button onClick={openCreate} className="btn-primary">
            <Plus className="h-4 w-4" /> Add product
          </button>
        )}
      </div>

      {/* Category filter chips */}
      <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1 scroll-area">
        <Filter className="h-4 w-4 text-slate-400 shrink-0" />
        {categories.map((c) => {
          const active = c === category;
          return (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors ${
                active
                  ? "bg-brand-50 text-brand-700 ring-brand-200"
                  : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>

      <section className="card overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, SKU or category…"
              className="input pl-9"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto scroll-area">
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Status</th>
                {canManage && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs text-slate-500">{p.sku}</td>
                  <td className="font-medium text-slate-900">{p.name}</td>
                  <td>
                    <span className="badge bg-slate-50 text-slate-700 ring-1 ring-slate-200">
                      {p.category}
                    </span>
                  </td>
                  <td className="text-slate-600">{p.unit}</td>
                  <td><span className="badge-approved capitalize">{p.status}</span></td>
                  {canManage && (
                    <td className="text-right whitespace-nowrap">
                      <button
                        onClick={() => openEdit(p)}
                        className="btn-ghost h-8 w-8 p-0"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeProduct(p.id)}
                        className="btn-ghost h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="py-12 text-center text-slate-500">
                    No products match your filters.
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
              <h3 className="text-lg font-semibold text-slate-900">
                {editingId ? "Edit product" : "Add new product"}
              </h3>
              <button onClick={() => setOpen(false)} className="btn-ghost h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submitProduct} className="space-y-3">
              <div>
                <label className="label">SKU</label>
                <input className="input" required value={draft.sku}
                  onChange={(e) => setDraft({ ...draft, sku: e.target.value })}
                  placeholder="e.g. CEM-50KG-001" />
              </div>
              <div>
                <label className="label">Name</label>
                <input className="input" required value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g. Cement 50kg bag" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Category</label>
                  <input className="input" required value={draft.category}
                    onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                    placeholder="Cement" />
                </div>
                <div>
                  <label className="label">Unit</label>
                  <input className="input" required value={draft.unit}
                    onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                    placeholder="bag / piece / metre" />
                </div>
              </div>
              {formError && <div className="alert-danger py-2.5 text-xs">{formError}</div>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? "Saving…" : editingId ? "Update product" : "Save product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

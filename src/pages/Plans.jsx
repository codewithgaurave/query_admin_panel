// src/pages/Plans.jsx
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { toast } from "sonner";
import {
  FaPlus, FaSearch, FaFilter, FaRupeeSign, FaClock, FaCheck, FaTimes,
  FaUsers, FaEdit, FaTrash, FaSync, FaTag, FaBoxOpen
} from "react-icons/fa";
import {
  listAdminPlans, listPublicPlans, createPlan, updatePlan, deletePlan
} from "../apis/plans";

const USER_TYPES = ["Seller", "Buyer", "Seller & Buyer Both"];
const CURRENCIES = ["INR", "USD", "EUR"]; // UI only; backend accepts "INR" per samples

const Plans = () => {
  const { themeColors } = useTheme();

  // data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [plans, setPlans] = useState([]);

  // filters
  const [q, setQ] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [showInactive, setShowInactive] = useState(true);

  // create form
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [fName, setFName] = useState("");
  const [fCode, setFCode] = useState("");
  const [fUserType, setFUserType] = useState("Seller");
  const [fPrice, setFPrice] = useState(999);
  const [fCurrency, setFCurrency] = useState("INR");
  const [fDuration, setFDuration] = useState(30);
  const [fFeatures, setFFeatures] = useState("Create auctions,Basic support");
  const [fMaxAuctions, setFMaxAuctions] = useState(3);
  const [fMaxBids, setFMaxBids] = useState(0);
  const [fActive, setFActive] = useState(true);

  // edit modal
  const [editing, setEditing] = useState(null); // plan object
  const [updating, setUpdating] = useState(false);

  // fetch (prefer admin list so inactive bhi aa sake)
  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError("");
      let res;
      try {
        res = await listAdminPlans();
      } catch {
        // fallback: public list (if admin endpoint not available)
        res = await listPublicPlans();
      }
      const list = res?.plans || [];
      setPlans(list);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to load plans.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return plans.filter((p) => {
      const typeOk = filterType === "All" ? true : p.userType === filterType;
      const activeOk = showInactive ? true : (p.status === "active" || p.isActive === true);
      const qOk =
        !ql ||
        [p.name, p.planId, p.code, p.userType]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(ql));
      return typeOk && activeOk && qOk;
    });
  }, [plans, q, filterType, showInactive]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const active = filtered.filter((p) => p.status === "active" || p.isActive === true).length;
    const seller = filtered.filter((p) => p.userType === "Seller").length;
    const buyer = filtered.filter((p) => p.userType === "Buyer").length;
    const both = filtered.filter((p) => p.userType === "Seller & Buyer Both").length;
    return { total, active, seller, buyer, both };
  }, [filtered]);

  const resetCreate = () => {
    setFName(""); setFCode("");
    setFUserType("Seller");
    setFPrice(999); setFCurrency("INR");
    setFDuration(30);
    setFFeatures("");
    setFMaxAuctions(0); setFMaxBids(0);
    setFActive(true);
  };

  const handleCreate = async () => {
    if (!fName || !fCode) {
      toast.error("Name & Code required");
      return;
    }
    try {
      setCreating(true);
      const payload = {
        name: fName,
        code: fCode,
        userType: fUserType,
        price: Number(fPrice),
        currency: fCurrency,
        durationDays: Number(fDuration),
        features: fFeatures
          ? fFeatures.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        limits: {
          maxAuctions:
            fUserType === "Seller" || fUserType === "Seller & Buyer Both"
              ? Number(fMaxAuctions || 0)
              : 0,
          maxBids:
            fUserType === "Buyer" || fUserType === "Seller & Buyer Both"
              ? Number(fMaxBids || 0)
              : 0,
        },
        isActive: Boolean(fActive),
      };
      const res = await createPlan(payload);
      toast.success(res?.message || "Plan created");
      setShowCreate(false);
      resetCreate();
      fetchPlans();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to create plan.";
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (p) => {
    // Backend update sample expects: price, limits, isActive
    setEditing({
      ...p,
      _price: p.price,
      _active: p.status ? p.status === "active" : !!p.isActive,
      _maxAuctions: p.sellerAuctionLimit ?? 0,
      _maxBids: p.buyerBidLimit ?? 0,
    });
  };

  const submitEdit = async () => {
    if (!editing) return;
    try {
      setUpdating(true);
      const body = {
        price: Number(editing._price),
        limits: {
          maxAuctions:
            editing.userType === "Seller" || editing.userType === "Seller & Buyer Both"
              ? Number(editing._maxAuctions || 0)
              : 0,
          maxBids:
            editing.userType === "Buyer" || editing.userType === "Seller & Buyer Both"
              ? Number(editing._maxBids || 0)
              : 0,
        },
        isActive: Boolean(editing._active),
      };
      const res = await updatePlan(editing.planId, body);
      toast.success(res?.message || "Plan updated");
      setEditing(null);
      fetchPlans();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to update plan.";
      toast.error(msg);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (planId) => {
    if (!window.confirm("Delete this plan? This action cannot be undone.")) return;
    try {
      const res = await deletePlan(planId);
      toast.success(res?.message || "Plan deleted");
      fetchPlans();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to delete plan.";
      toast.error(msg);
    }
  };

  // UI helpers
  const badge = (ok) => (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
      style={{
        backgroundColor: (ok ? themeColors.success : themeColors.danger) + "20",
        color: ok ? themeColors.success : themeColors.danger,
      }}
    >
      {ok ? <FaCheck /> : <FaTimes />} {ok ? "active" : "inactive"}
    </span>
  );

  // Render
  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4" style={{ color: themeColors.text }}>Loading plans...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 rounded-lg border" style={{ borderColor: themeColors.border, color: themeColors.danger }}>
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: themeColors.text }}>
            📜 Subscription Plans (Admin)
          </h1>
          <p className="text-sm mt-1 opacity-75" style={{ color: themeColors.text }}>
            Create, update, or delete plans for Seller/Buyer/Both.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchPlans}
            className="px-3 py-2 rounded-lg border text-sm flex items-center gap-2"
            style={{ borderColor: themeColors.border, color: themeColors.text, backgroundColor: themeColors.surface }}
          >
            <FaSync /> Refresh
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-3 py-2 rounded-lg text-sm font-semibold"
            style={{ backgroundColor: themeColors.primary, color: themeColors.onPrimary }}
          >
            <FaPlus className="inline mr-2" /> New Plan
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border p-3 md:p-4" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:items-end">
          <div className="relative md:col-span-2">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name / code / planId / type"
              className="w-full pl-9 pr-3 py-2 rounded-lg border"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}
            />
          </div>
          <div>
            <label className="text-xs mb-1 block opacity-70" style={{ color: themeColors.text }}>
              User Type
            </label>
            <div className="flex items-center gap-2">
              <FaFilter className="opacity-70" />
              <select
                className="w-full p-2 rounded-lg border text-sm"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}
              >
                <option>All</option>
                {USER_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs mb-1 block opacity-70" style={{ color: themeColors.text }}>
              Show Inactive
            </label>
            <button
              onClick={() => setShowInactive((v) => !v)}
              className="w-full p-2 rounded-lg border flex items-center justify-between"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}
            >
              <span className="text-sm">Include inactive plans</span>
              {showInactive ? badge(true) : badge(false)}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: "Plans (Filtered)", value: stats.total, icon: FaBoxOpen },
          { title: "Active", value: stats.active, icon: FaCheck },
          { title: "Seller", value: stats.seller, icon: FaUsers },
          { title: "Buyer/Both", value: stats.buyer + stats.both, icon: FaUsers },
        ].map((s, i) => (
          <div
            key={i}
            className="p-6 rounded-xl border transition-all duration-300 hover:shadow-lg group"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-sm font-medium mb-1 opacity-75" style={{ color: themeColors.text }}>{s.title}</p>
                <p className="text-2xl font-bold mb-2" style={{ color: themeColors.primary }}>{s.value}</p>
                <p className="text-xs opacity-60" style={{ color: themeColors.text }}>Overview</p>
              </div>
              <div className="p-3 rounded-xl group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: themeColors.primary + "15" }}>
                <s.icon className="text-lg" style={{ color: themeColors.primary }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border shadow-md overflow-hidden" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: themeColors.background + "30" }}>
                {[
                  "Plan", "Plan ID", "Type", "Price", "Duration", "Limits", "Features", "Status", "Actions"
                ].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: themeColors.text }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: themeColors.border }}>
              {filtered.map((p) => {
                const isActive = p.status ? p.status === "active" : !!p.isActive;
                return (
                  <tr key={p.planId} style={{ backgroundColor: themeColors.surface }}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-sm" style={{ color: themeColors.text }}>
                        <FaTag className="inline mr-2 opacity-70" />
                        {p.name} {p.code ? <span className="opacity-60">({p.code})</span> : null}
                      </div>
                      <div className="text-xs opacity-70" style={{ color: themeColors.text }}>
                        {p.description || ""}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm opacity-80">{p.planId}</td>
                    <td className="px-6 py-4 text-sm opacity-80">{p.userType}</td>
                    <td className="px-6 py-4 text-sm">
                      <FaRupeeSign className="inline opacity-70" /> {p.price} {p.currency}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <FaClock className="inline opacity-70" /> {p.durationDays} days
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {p.sellerAuctionLimit != null && <div>Auctions: <strong>{p.sellerAuctionLimit}</strong></div>}
                      {p.buyerBidLimit != null && <div>Bids: <strong>{p.buyerBidLimit}</strong></div>}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex flex-wrap gap-2">
                        {(p.features || []).map((f) => (
                          <span key={f} className="px-2 py-1 rounded text-xs font-semibold"
                            style={{ backgroundColor: themeColors.info + "15", color: themeColors.info }}>
                            {f}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {badge(isActive)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(p)}
                          className="px-3 py-2 rounded-lg text-xs font-semibold"
                          style={{ backgroundColor: themeColors.primary + "15", color: themeColors.primary }}
                        >
                          <FaEdit className="inline mr-1" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(p.planId)}
                          className="px-3 py-2 rounded-lg text-xs font-semibold"
                          style={{ backgroundColor: themeColors.danger + "15", color: themeColors.danger }}
                        >
                          <FaTrash className="inline mr-1" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-sm" style={{ color: themeColors.text }}>
                    No plans match current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-2xl rounded-xl border p-5"
               style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: themeColors.text }}>
              <FaPlus className="inline mr-2" /> Create Plan
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs opacity-70">Name</label>
                <input className="w-full p-2 rounded-lg border" value={fName} onChange={(e)=>setFName(e.target.value)}
                  style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}/>
              </div>
              <div>
                <label className="text-xs opacity-70">Code</label>
                <input className="w-full p-2 rounded-lg border" value={fCode} onChange={(e)=>setFCode(e.target.value)}
                  style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}/>
              </div>
              <div>
                <label className="text-xs opacity-70">User Type</label>
                <select className="w-full p-2 rounded-lg border" value={fUserType} onChange={(e)=>setFUserType(e.target.value)}
                  style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}>
                  {USER_TYPES.map((u)=> <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs opacity-70">Price</label>
                <input type="number" className="w-full p-2 rounded-lg border" value={fPrice} min="0" onChange={(e)=>setFPrice(e.target.value)}
                  style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}/>
              </div>
              <div>
                <label className="text-xs opacity-70">Currency</label>
                <select className="w-full p-2 rounded-lg border" value={fCurrency} onChange={(e)=>setFCurrency(e.target.value)}
                  style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}>
                  {CURRENCIES.map((c)=> <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs opacity-70">Duration (days)</label>
                <input type="number" className="w-full p-2 rounded-lg border" value={fDuration} min="1" onChange={(e)=>setFDuration(e.target.value)}
                  style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}/>
              </div>

              {/* Limits */}
              {(fUserType === "Seller" || fUserType === "Seller & Buyer Both") && (
                <div>
                  <label className="text-xs opacity-70">Max Auctions</label>
                  <input type="number" className="w-full p-2 rounded-lg border" value={fMaxAuctions} min="0" onChange={(e)=>setFMaxAuctions(e.target.value)}
                    style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}/>
                </div>
              )}
              {(fUserType === "Buyer" || fUserType === "Seller & Buyer Both") && (
                <div>
                  <label className="text-xs opacity-70">Max Bids</label>
                  <input type="number" className="w-full p-2 rounded-lg border" value={fMaxBids} min="0" onChange={(e)=>setFMaxBids(e.target.value)}
                    style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}/>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="text-xs opacity-70">Features (comma separated)</label>
                <input className="w-full p-2 rounded-lg border" value={fFeatures} onChange={(e)=>setFFeatures(e.target.value)}
                  placeholder="Create auctions, Basic support"
                  style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}/>
              </div>

              <div className="md:col-span-2 flex items-center gap-2">
                <input id="active" type="checkbox" checked={fActive} onChange={(e)=>setFActive(e.target.checked)} />
                <label htmlFor="active" className="text-sm">Active</label>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={()=>setShowCreate(false)}
                className="px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: themeColors.border }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-3 py-2 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: themeColors.primary, color: themeColors.onPrimary }}
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} />
          <div className="relative w-full max-w-xl rounded-xl border p-5"
               style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: themeColors.text }}>
              <FaEdit className="inline mr-2" /> Edit Plan
            </h3>

            <div className="space-y-3">
              <div className="text-sm opacity-80">
                <strong>{editing.name}</strong> — {editing.planId} — {editing.userType}
              </div>

              <div>
                <label className="text-xs opacity-70">Price</label>
                <input type="number" className="w-full p-2 rounded-lg border" value={editing._price}
                  onChange={(e)=>setEditing({ ...editing, _price: e.target.value })}
                  style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}/>
              </div>

              {(editing.userType === "Seller" || editing.userType === "Seller & Buyer Both") && (
                <div>
                  <label className="text-xs opacity-70">Max Auctions</label>
                  <input type="number" className="w-full p-2 rounded-lg border" value={editing._maxAuctions}
                    onChange={(e)=>setEditing({ ...editing, _maxAuctions: e.target.value })}
                    style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}/>
                </div>
              )}

              {(editing.userType === "Buyer" || editing.userType === "Seller & Buyer Both") && (
                <div>
                  <label className="text-xs opacity-70">Max Bids</label>
                  <input type="number" className="w-full p-2 rounded-lg border" value={editing._maxBids}
                    onChange={(e)=>setEditing({ ...editing, _maxBids: e.target.value })}
                    style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}/>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input id="editActive" type="checkbox" checked={editing._active}
                  onChange={(e)=>setEditing({ ...editing, _active: e.target.checked })}/>
                <label htmlFor="editActive" className="text-sm">Active</label>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={()=>setEditing(null)}
                className="px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: themeColors.border }}
              >
                Cancel
              </button>
              <button
                onClick={submitEdit}
                disabled={updating}
                className="px-3 py-2 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: themeColors.primary, color: themeColors.onPrimary }}
              >
                {updating ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Plans;

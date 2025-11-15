// src/pages/Purchases.jsx
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { toast } from "sonner";
import {
  FaSync,
  FaSearch,
  FaFilter,
  FaUser,
  FaCalendar,
  FaRupeeSign,
  FaGavel,
} from "react-icons/fa";
import { listPurchasesAdmin } from "../apis/purchases";

const Purchases = () => {
  const { themeColors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [purchases, setPurchases] = useState([]);

  // pagination + filters
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [userType, setUserType] = useState("All");

  const fetchPurchases = async (pg = 1) => {
    try {
      setLoading(true);
      setError("");
      const res = await listPurchasesAdmin({
        page: pg,
        limit,
        q: q || undefined,
        status: status !== "all" ? status : undefined,
        userType: userType !== "All" ? userType : undefined,
      });
      setPurchases(res?.purchases || []);
      setPage(res?.page || 1);
      setTotalPages(res?.totalPages || 1);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to load purchases.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases(1);
  }, [status, userType]);

  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : "-");
  const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString() : "-");
  const fmtMoney = (n) =>
    typeof n === "number" ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : n || "-";

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return purchases;
    return purchases.filter(
      (p) =>
        String(p.userId).toLowerCase().includes(ql) ||
        String(p.user?.name || "").toLowerCase().includes(ql) ||
        String(p.user?.email || "").toLowerCase().includes(ql) ||
        String(p.plan?.name || "").toLowerCase().includes(ql)
    );
  }, [purchases, q]);

  const Pager = () => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => fetchPurchases(Math.max(1, page - 1))}
        disabled={page <= 1 || loading}
        className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50"
        style={{
          borderColor: themeColors.border,
          backgroundColor: themeColors.background,
          color: themeColors.text,
        }}
      >
        Prev
      </button>
      <div
        className="px-3 py-1.5 rounded-lg border text-sm"
        style={{
          borderColor: themeColors.border,
          backgroundColor: themeColors.background,
          color: themeColors.text,
        }}
      >
        Page {page}/{totalPages}
      </div>
      <button
        onClick={() => fetchPurchases(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages || loading}
        className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50"
        style={{
          borderColor: themeColors.border,
          backgroundColor: themeColors.background,
          color: themeColors.text,
        }}
      >
        Next
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4" style={{ color: themeColors.text }}>
            Loading purchase history...
          </p>
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
            🧾 Purchased History
          </h1>
          <p className="text-sm opacity-70" style={{ color: themeColors.text }}>
            All user subscriptions purchased through the platform.
          </p>
        </div>
        <button
          onClick={() => fetchPurchases(page)}
          className="px-3 py-2 rounded-lg border text-sm flex items-center gap-2"
          style={{
            borderColor: themeColors.border,
            color: themeColors.text,
            backgroundColor: themeColors.surface,
          }}
        >
          <FaSync /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div
        className="rounded-xl border p-3 md:p-4"
        style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div className="relative md:col-span-2">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by user name, email, plan, or userId"
              className="w-full pl-9 pr-3 py-2 rounded-lg border"
              style={{
                borderColor: themeColors.border,
                backgroundColor: themeColors.background,
                color: themeColors.text,
              }}
            />
          </div>

          {/* status */}
          <div>
            <label className="text-xs mb-1 block opacity-70" style={{ color: themeColors.text }}>
              Status
            </label>
            <div className="flex items-center gap-2">
              <FaFilter className="opacity-70" />
              <select
                className="w-full p-2 rounded-lg border text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                }}
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* user type */}
          <div>
            <label className="text-xs mb-1 block opacity-70" style={{ color: themeColors.text }}>
              User Type
            </label>
            <div className="flex items-center gap-2">
              <FaFilter className="opacity-70" />
              <select
                className="w-full p-2 rounded-lg border text-sm"
                value={userType}
                onChange={(e) => setUserType(e.target.value)}
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                }}
              >
                <option value="All">All</option>
                <option value="Seller">Seller</option>
                <option value="Buyer">Buyer</option>
                <option value="Seller & Buyer Both">Seller & Buyer Both</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl border shadow-md overflow-hidden"
        style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: themeColors.background + "30" }}>
                {[
                  "User",
                  "Email",
                  "User Type",
                  "Plan",
                  "Price",
                  "Start–End",
                  "Remaining",
                  "Status",
                  "Payment Ref",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: themeColors.text }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: themeColors.border }}>
              {filtered.map((p) => (
                <tr key={p.userSubId} style={{ backgroundColor: themeColors.surface }}>
                  <td className="px-6 py-4 text-sm">
                    <FaUser className="inline mr-1 opacity-70" />
                    {p.user?.name || "-"} <br />
                    <span className="text-xs opacity-70">{p.userId}</span>
                  </td>
                  <td className="px-6 py-4 text-sm opacity-80">{p.user?.email || "-"}</td>
                  <td className="px-6 py-4 text-sm opacity-80">{p.userType}</td>
                  <td className="px-6 py-4 text-sm">
                    <FaGavel className="inline mr-1 opacity-70" />
                    {p.planSnapshot?.name || p.plan?.name || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <FaRupeeSign className="inline opacity-70" />{" "}
                    {p.planSnapshot?.price || p.plan?.price} {p.planSnapshot?.currency || "INR"}
                  </td>
                  <td className="px-6 py-4 text-sm opacity-80">
                    <FaCalendar className="inline mr-1 opacity-70" />
                    {fmtDate(p.startDate)} → {fmtDate(p.endDate)}
                  </td>
                  <td className="px-6 py-4 text-sm opacity-80">
                    Auctions:{" "}
                    <strong>
                      {p.remainingAuctions != null ? p.remainingAuctions : "∞"}
                    </strong>{" "}
                    <br />
                    Bids:{" "}
                    <strong>{p.remainingBids != null ? p.remainingBids : "∞"}</strong>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        p.status === "active"
                          ? "bg-green-200 text-green-700"
                          : p.status === "expired"
                          ? "bg-yellow-200 text-yellow-800"
                          : "bg-red-200 text-red-800"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm opacity-80">{p.paymentRef || "-"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-sm" style={{ color: themeColors.text }}>
                    No purchases match current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          className="px-6 py-4 border-t flex items-center justify-between text-sm"
          style={{ borderColor: themeColors.border, color: themeColors.text }}
        >
          <div>Total records: {filtered.length}</div>
          <Pager />
        </div>
      </div>
    </div>
  );
};

export default Purchases;

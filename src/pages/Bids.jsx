// src/pages/Bids.jsx
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { toast } from "sonner";
import {
  FaSearch,
  FaFilter,
  FaGavel,
  FaBox,
  FaUser,
  FaCalendar,
  FaChevronDown,
  FaChevronRight,
  FaRupeeSign,
  FaSortAmountDownAlt,
  FaSortAmountUpAlt,
} from "react-icons/fa";
import { listAdminLots } from "../apis/lots";
import { listBidsForLot } from "../apis/bids";

const LOT_STATUSES = ["active", "sold", "unsold", "cancelled"];

const Bids = () => {
  const { themeColors } = useTheme();

  // LOTS (top-level)
  const [loadingLots, setLoadingLots] = useState(true);
  const [errorLots, setErrorLots] = useState("");
  const [lots, setLots] = useState([]);

  // filters for lots
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterAuctionId, setFilterAuctionId] = useState("");
  const [filterSellerId, setFilterSellerId] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // client pagination for lots
  const PER_PAGE_LOTS = 8;
  const [pageLots, setPageLots] = useState(1);

  // expanded lots → bids state map
  // shape: { [lotId]: { loading, error, page, totalPages, totalBids, bids: [], minAmt, maxAmt, qBidder, sortBy, sortDir } }
  const [expanded, setExpanded] = useState({});

  const fmtMoney = (n) =>
    typeof n === "number" ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : n || "-";
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : "-");
  const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString() : "-");

  // load lots (server)
  const fetchLots = async () => {
    try {
      setLoadingLots(true);
      setErrorLots("");
      const res = await listAdminLots({
        page: 1,
        limit: 200, // enough; client paginate
        status: filterStatus,
        auctionId: filterAuctionId || undefined,
        sellerId: filterSellerId || undefined,
        category: filterCategory !== "All" ? filterCategory : undefined,
        minPrice: minPrice || undefined,
        maxPrice: maxPrice || undefined,
        search: q || undefined,
      });
      setLots(res?.lots || []);
      setPageLots(1);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to load lots.";
      setErrorLots(msg);
      toast.error(msg);
    } finally {
      setLoadingLots(false);
    }
  };

  useEffect(() => {
    fetchLots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterAuctionId, filterSellerId, filterCategory, minPrice, maxPrice, q]);

  const allCategories = useMemo(() => {
    const set = new Set(lots.map((l) => l.category).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [lots]);

  const getStatusColor = (status) => {
    const s = String(status || "").toLowerCase();
    const map = {
      active: themeColors.info,
      sold: themeColors.success,
      unsold: themeColors.text,
      cancelled: themeColors.danger,
    };
    return map[s] || themeColors.text;
  };

  const lotsSlice = useMemo(() => {
    const start = (pageLots - 1) * PER_PAGE_LOTS;
    return lots.slice(start, start + PER_PAGE_LOTS);
  }, [lots, pageLots]);

  const totalLotPages = Math.max(1, Math.ceil(lots.length / PER_PAGE_LOTS));

  // expand/collapse per lot
  const toggleExpand = async (lot) => {
    const id = lot.lotId;
    const current = expanded[id];

    // collapse
    if (current && !current.loading) {
      const clone = { ...expanded };
      delete clone[id];
      setExpanded(clone);
      return;
    }

    // expand (load bids page 1)
    const next = {
      loading: true,
      error: "",
      page: 1,
      totalPages: 1,
      totalBids: 0,
      bids: [],
      // local filters for bids in this lot:
      qBidder: "",
      minAmt: "",
      maxAmt: "",
      sortBy: "amount",
      sortDir: "desc",
    };
    setExpanded({ ...expanded, [id]: next });

    try {
      const res = await listBidsForLot(id, { page: 1, limit: 20 });
      setExpanded((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          loading: false,
          error: "",
          page: res?.page || 1,
          totalPages: res?.totalPages || 1,
          totalBids: res?.totalBids || 0,
          bids: res?.bids || [],
        },
      }));
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to load bids.";
      setExpanded((prev) => ({ ...prev, [id]: { ...prev[id], loading: false, error: msg } }));
      toast.error(msg);
    }
  };

  // load bids page (per lot)
  const pageBids = async (lotId, toPage) => {
    const st = expanded[lotId];
    if (!st || st.loading) return;
    setExpanded((prev) => ({ ...prev, [lotId]: { ...prev[lotId], loading: true } }));
    try {
      const res = await listBidsForLot(lotId, { page: toPage, limit: 20 });
      setExpanded((prev) => ({
        ...prev,
        [lotId]: {
          ...prev[lotId],
          loading: false,
          error: "",
          page: res?.page || toPage,
          totalPages: res?.totalPages || 1,
          totalBids: res?.totalBids || 0,
          bids: res?.bids || [],
        },
      }));
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to load bids.";
      setExpanded((prev) => ({ ...prev, [lotId]: { ...prev[lotId], loading: false, error: msg } }));
      toast.error(msg);
    }
  };

  // derive filtered/sorted bids per lot (client-side)
  const getFilteredBids = (st) => {
    if (!st) return [];
    let arr = st.bids.slice();
    const { qBidder, minAmt, maxAmt, sortBy, sortDir } = st;

    if (qBidder?.trim()) {
      const q = qBidder.trim().toLowerCase();
      arr = arr.filter((b) => String(b.bidderId).toLowerCase().includes(q));
    }
    if (minAmt) arr = arr.filter((b) => Number(b.amount) >= Number(minAmt));
    if (maxAmt) arr = arr.filter((b) => Number(b.amount) <= Number(maxAmt));

    arr.sort((a, b) => {
      if (sortBy === "amount") {
        return sortDir === "asc" ? a.amount - b.amount : b.amount - a.amount;
      } else {
        return sortDir === "asc"
          ? new Date(a.createdAt) - new Date(b.createdAt)
          : new Date(b.createdAt) - new Date(a.createdAt);
      }
    });
    return arr;
  };

  // Stats
  const StatsCards = useMemo(() => {
    const totalLots = lots.length;
    const totalBidsCount = Object.values(expanded).reduce((acc, s) => acc + (s?.totalBids || 0), 0);
    const activeLots = lots.filter((l) => l.status === "active").length;
    return [
      { title: "Lots (Filtered)", value: String(totalLots), icon: FaBox, description: "Visible after filters" },
      { title: "Expanded Lots", value: String(Object.keys(expanded).length), icon: FaGavel, description: "Open panels" },
      { title: "Total Bids (expanded)", value: String(totalBidsCount), icon: FaGavel, description: "Across visible panels" },
      { title: "Active Lots", value: String(activeLots), icon: FaGavel, description: "Open for bidding" },
    ];
  }, [lots, expanded, themeColors]);

  // UI: pager for lots
  const LotsPager = () => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setPageLots((p) => Math.max(1, p - 1))}
        disabled={pageLots <= 1}
        className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50"
        style={{ borderColor: themeColors.border, color: themeColors.text, backgroundColor: themeColors.background }}
      >
        Previous
      </button>
      <div
        className="px-3 py-1.5 rounded-lg border text-sm"
        style={{ borderColor: themeColors.border, color: themeColors.text, backgroundColor: themeColors.background }}
      >
        Page {pageLots} / {totalLotPages}
      </div>
      <button
        onClick={() => setPageLots((p) => Math.min(totalLotPages, p + 1))}
        disabled={pageLots >= totalLotPages}
        className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50"
        style={{ borderColor: themeColors.border, color: themeColors.text, backgroundColor: themeColors.background }}
      >
        Next
      </button>
    </div>
  );

  // Loading & error states (lots)
  if (loadingLots) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4" style={{ color: themeColors.text }}>Loading lots...</p>
        </div>
      </div>
    );
  }
  if (errorLots) {
    return (
      <div className="p-4 rounded-lg border" style={{ borderColor: themeColors.border, color: themeColors.danger }}>
        {errorLots}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: themeColors.text }}>
            🪙 Bids (Lot-wise)
          </h1>
          <p className="text-sm mt-1 opacity-75" style={{ color: themeColors.text }}>
            Expand any lot to view its bids, highest bid, and bidder details.
          </p>
        </div>
      </div>

      {/* Filters for Lots */}
      <div className="rounded-xl border p-3 md:p-4" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* search */}
          <div className="relative col-span-1 md:col-span-2">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search lot name / description / lotId"
              className="w-full pl-9 pr-3 py-2 rounded-lg border"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}
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
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}
              >
                <option value="all">All</option>
                {LOT_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* category */}
          <div>
            <label className="text-xs mb-1 block opacity-70" style={{ color: themeColors.text }}>
              Category
            </label>
            <div className="flex items-center gap-2">
              <FaFilter className="opacity-70" />
              <select
                className="w-full p-2 rounded-lg border text-sm"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}
              >
                {allCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* auction id */}
          <div>
            <label className="text-xs mb-1 block opacity-70" style={{ color: themeColors.text }}>
              Auction ID
            </label>
            <div className="flex items-center gap-2">
              <FaGavel className="opacity-70" />
              <input
                value={filterAuctionId}
                onChange={(e) => setFilterAuctionId(e.target.value)}
                placeholder="e.g. AUC360NWEQET"
                className="w-full p-2 rounded-lg border text-sm"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}
              />
            </div>
          </div>

          {/* seller id */}
          <div>
            <label className="text-xs mb-1 block opacity-70" style={{ color: themeColors.text }}>
              Seller ID
            </label>
            <div className="flex items-center gap-2">
              <FaUser className="opacity-70" />
              <input
                value={filterSellerId}
                onChange={(e) => setFilterSellerId(e.target.value)}
                placeholder="e.g. AUCNPGKTE6J4"
                className="w-full p-2 rounded-lg border text-sm"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}
              />
            </div>
          </div>

          {/* min price */}
          <div>
            <label className="text-xs mb-1 block opacity-70" style={{ color: themeColors.text }}>
              Min Price
            </label>
            <div className="flex items-center gap-2">
              <FaRupeeSign className="opacity-70" />
              <input
                type="number"
                min="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="0"
                className="w-full p-2 rounded-lg border text-sm"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}
              />
            </div>
          </div>

          {/* max price */}
          <div>
            <label className="text-xs mb-1 block opacity-70" style={{ color: themeColors.text }}>
              Max Price
            </label>
            <div className="flex items-center gap-2">
              <FaRupeeSign className="opacity-70" />
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="100000"
                className="w-full p-2 rounded-lg border text-sm"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {StatsCards.map((s, i) => (
          <div
            key={i}
            className="p-6 rounded-xl border transition-all duration-300 hover:shadow-lg group"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-sm font-medium mb-1 opacity-75" style={{ color: themeColors.text }}>{s.title}</p>
                <p className="text-2xl font-bold mb-2" style={{ color: themeColors.primary }}>{s.value}</p>
                <p className="text-xs opacity-60" style={{ color: themeColors.text }}>{s.description}</p>
              </div>
              <div className="p-3 rounded-xl group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: themeColors.primary + "15" }}>
                <s.icon className="text-lg" style={{ color: themeColors.primary }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* LOTS list (accordion style) */}
      <div
        className="rounded-2xl border shadow-md overflow-hidden"
        style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
      >
        <div className="divide-y" style={{ borderColor: themeColors.border }}>
          {lotsSlice.map((l) => {
            const st = expanded[l.lotId];
            const color = getStatusColor(l.status);
            const highest = st?.bids?.reduce((m, b) => (b.amount > (m?.amount ?? 0) ? b : m), null);

            return (
              <div key={l.lotId}>
                {/* Header row */}
                <button
                  onClick={() => toggleExpand(l)}
                  className="w-full flex items-center gap-3 px-4 py-3"
                  style={{ color: themeColors.text, backgroundColor: themeColors.surface }}
                >
                  {st ? <FaChevronDown /> : <FaChevronRight />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">{l.lotName}</span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize"
                        style={{ backgroundColor: color + "25", color }}
                      >
                        {l.status}
                      </span>
                    </div>
                    <div className="text-xs opacity-70 truncate">
                      {l.lotId} • {l.category} • {l.auction?.auctionName || "-"} ({l.auction?.auctionId || "-"})
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-4 text-sm">
                    <div>Start: <strong>₹{fmtMoney(l.startPrice)}</strong></div>
                    <div>Current: <strong>₹{fmtMoney(l.currentBid)}</strong></div>
                    <div>Images: <strong>{l.imagesCount ?? (l.images?.length || 0)}</strong></div>
                  </div>
                </button>

                {/* Expanded body */}
                {st && (
                  <div className="px-4 pb-4">
                    {st.loading && st.bids.length === 0 && (
                      <div className="py-6 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="mt-3 text-sm">Loading bids...</p>
                      </div>
                    )}
                    {!!st.error && (
                      <div className="p-3 rounded-lg border my-3" style={{ borderColor: themeColors.border, color: themeColors.danger }}>
                        {st.error}
                      </div>
                    )}

                    {/* Quick stats */}
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                      <div className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: themeColors.border }}>
                        Total Bids: <strong>{st.totalBids}</strong>
                      </div>
                      <div className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: themeColors.border }}>
                        Highest: <strong>{highest ? `₹${fmtMoney(highest.amount)}` : "-"}</strong>
                      </div>
                      <div className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: themeColors.border }}>
                        Auction: <strong>{l.auction?.status || "-"}</strong> • <FaCalendar className="inline opacity-70" /> {fmtDate(l.auction?.startDate)} – {fmtDate(l.auction?.endDate)}
                      </div>
                    </div>

                    {/* Per-lot bid filters */}
                    <div
                      className="rounded-xl border p-3 md:p-4 mt-3"
                      style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                        {/* bidderId */}
                        <div className="relative">
                          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
                          <input
                            value={st.qBidder}
                            onChange={(e) =>
                              setExpanded((prev) => ({ ...prev, [l.lotId]: { ...prev[l.lotId], qBidder: e.target.value } }))
                            }
                            placeholder="Search by bidderId"
                            className="w-full pl-9 pr-3 py-2 rounded-lg border"
                            style={{
                              borderColor: themeColors.border,
                              backgroundColor: themeColors.background,
                              color: themeColors.text,
                            }}
                          />
                        </div>

                        {/* min amount */}
                        <div>
                          <label className="text-xs mb-1 block opacity-70" style={{ color: themeColors.text }}>
                            Min Amount
                          </label>
                          <div className="flex items-center gap-2">
                            <FaRupeeSign className="opacity-70" />
                            <input
                              type="number"
                              min="0"
                              value={st.minAmt}
                              onChange={(e) =>
                                setExpanded((prev) => ({ ...prev, [l.lotId]: { ...prev[l.lotId], minAmt: e.target.value } }))
                              }
                              className="w-full p-2 rounded-lg border text-sm"
                              style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}
                            />
                          </div>
                        </div>

                        {/* max amount */}
                        <div>
                          <label className="text-xs mb-1 block opacity-70" style={{ color: themeColors.text }}>
                            Max Amount
                          </label>
                          <div className="flex items-center gap-2">
                            <FaRupeeSign className="opacity-70" />
                            <input
                              type="number"
                              min="0"
                              value={st.maxAmt}
                              onChange={(e) =>
                                setExpanded((prev) => ({ ...prev, [l.lotId]: { ...prev[l.lotId], maxAmt: e.target.value } }))
                              }
                              className="w-full p-2 rounded-lg border text-sm"
                              style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}
                            />
                          </div>
                        </div>

                        {/* sort */}
                        <div>
                          <label className="text-xs mb-1 block opacity-70" style={{ color: themeColors.text }}>
                            Sort
                          </label>
                          <div className="flex items-center gap-2">
                            <FaFilter className="opacity-70" />
                            <select
                              className="w-full p-2 rounded-lg border text-sm"
                              value={`${st.sortBy}:${st.sortDir}`}
                              onChange={(e) => {
                                const [sb, sd] = e.target.value.split(":");
                                setExpanded((prev) => ({ ...prev, [l.lotId]: { ...prev[l.lotId], sortBy: sb, sortDir: sd } }));
                              }}
                              style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}
                            >
                              <option value="amount:desc">Amount (High → Low)</option>
                              <option value="amount:asc">Amount (Low → High)</option>
                              <option value="date:desc">Date (Newest → Oldest)</option>
                              <option value="date:asc">Date (Oldest → Newest)</option>
                            </select>
                            {st.sortDir === "desc" ? <FaSortAmountDownAlt /> : <FaSortAmountUpAlt />}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bids Table */}
                    <div
                      className="rounded-2xl border shadow-sm overflow-hidden mt-3"
                      style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
                    >
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr style={{ backgroundColor: themeColors.background + "30" }}>
                              {["Bid ID", "Bidder", "Amount", "Time"].map((h) => (
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
                            {getFilteredBids(st).map((b) => (
                              <tr key={b.bidId} style={{ backgroundColor: themeColors.surface }}>
                                <td className="px-6 py-4 text-sm">{b.bidId}</td>
                                <td className="px-6 py-4 text-sm">
                                  <FaUser className="inline mr-1 opacity-70" />
                                  {b.bidderId}
                                </td>
                                <td className="px-6 py-4 text-sm font-semibold" style={{ color: themeColors.primary }}>
                                  ₹{fmtMoney(b.amount)}
                                </td>
                                <td className="px-6 py-4 text-sm opacity-80">
                                  <FaCalendar className="inline mr-1 opacity-70" />
                                  {fmtDateTime(b.createdAt)}
                                </td>
                              </tr>
                            ))}
                            {getFilteredBids(st).length === 0 && (
                              <tr>
                                <td colSpan={4} className="px-6 py-10 text-center text-sm">
                                  No bids match your filters.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* per-lot pagination */}
                      <div
                        className="px-6 py-4 border-t flex items-center justify-between text-sm"
                        style={{ borderColor: themeColors.border }}
                      >
                        <div>Total bids (server): {st.totalBids}</div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => pageBids(l.lotId, Math.max(1, st.page - 1))}
                            disabled={st.page <= 1 || st.loading}
                            className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50"
                            style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                          >
                            Previous
                          </button>
                          <div
                            className="px-3 py-1.5 rounded-lg border text-sm"
                            style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                          >
                            Page {st.page} / {st.totalPages}
                          </div>
                          <button
                            onClick={() => pageBids(l.lotId, Math.min(st.totalPages, st.page + 1))}
                            disabled={st.page >= st.totalPages || st.loading}
                            className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50"
                            style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {lotsSlice.length === 0 && (
            <div className="p-8 text-center" style={{ color: themeColors.text }}>
              No lots for current filters.
            </div>
          )}
        </div>
      </div>

      {/* Lots Pagination */}
      <div
        className="px-6 py-4 rounded-xl border flex items-center justify-between text-sm"
        style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface, color: themeColors.text }}
      >
        <div>
          Showing {(pageLots - 1) * PER_PAGE_LOTS + 1}–
          {Math.min(pageLots * PER_PAGE_LOTS, lots.length)} of {lots.length}
        </div>
        <LotsPager />
      </div>
    </div>
  );
};

export default Bids;

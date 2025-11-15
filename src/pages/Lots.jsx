// src/pages/Lots.jsx
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { toast } from "sonner";
import {
  FaSearch,
  FaFilter,
  FaTh,
  FaList,
  FaGavel,
  FaBox,
  FaUser,
  FaCalendar,
  FaRupeeSign,
  FaTags,
  FaArrowLeft,
  FaSortAmountDownAlt,
  FaSortAmountUpAlt,
} from "react-icons/fa";
import { listAdminLots } from "../apis/lots";
import { listBidsForLot } from "../apis/bids";

const LOT_STATUSES = ["active", "sold", "unsold", "cancelled"];

/* ---------------------------
   Inline Bids Panel (same page)
---------------------------- */
const BidsPanel = ({ lotId, lotMeta, onBack }) => {
  const { themeColors } = useTheme();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [server, setServer] = useState({ totalPages: 1, totalBids: 0 });
  const [bids, setBids] = useState([]);

  // filters (client-side)
  const [qBidder, setQBidder] = useState("");
  const [minAmt, setMinAmt] = useState("");
  const [maxAmt, setMaxAmt] = useState("");
  const [sortBy, setSortBy] = useState("amount"); // "amount" | "date"
  const [sortDir, setSortDir] = useState("desc"); // "asc" | "desc"

  const fmtMoney = (n) =>
    typeof n === "number" ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : n;
  const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString() : "-");

  const fetchBids = async (id, p = 1) => {
    if (!id) return;
    try {
      setLoading(true);
      setError("");
      const res = await listBidsForLot(id, { page: p, limit });
      setBids(res?.bids || []);
      setServer({ totalPages: res?.totalPages || 1, totalBids: res?.totalBids || 0 });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to load bids.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBids(lotId, 1);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotId]);

  const filteredBids = useMemo(() => {
    let arr = bids.slice();
    if (qBidder.trim()) {
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
  }, [bids, qBidder, minAmt, maxAmt, sortBy, sortDir]);

  const highestBid = useMemo(() => {
    if (!bids.length) return null;
    return bids.reduce((m, b) => (b.amount > (m?.amount ?? 0) ? b : m), null);
  }, [bids]);

  const Pager = () => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => {
          const np = Math.max(1, page - 1);
          setPage(np);
          fetchBids(lotId, np);
        }}
        disabled={page <= 1 || loading}
        className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50"
        style={{ borderColor: themeColors.border, color: themeColors.text, backgroundColor: themeColors.background }}
      >
        Previous
      </button>
      <div
        className="px-3 py-1.5 rounded-lg border text-sm"
        style={{ borderColor: themeColors.border, color: themeColors.text, backgroundColor: themeColors.background }}
      >
        Page {page} / {server.totalPages}
      </div>
      <button
        onClick={() => {
          const np = Math.min(server.totalPages, page + 1);
          setPage(np);
          fetchBids(lotId, np);
        }}
        disabled={page >= server.totalPages || loading}
        className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50"
        style={{ borderColor: themeColors.border, color: themeColors.text, backgroundColor: themeColors.background }}
      >
        Next
      </button>
    </div>
  );

  if (loading && bids.length === 0) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4" style={{ color: themeColors.text }}>
            Loading bids...
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
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-3 py-2 rounded-lg border text-sm flex items-center gap-2"
          style={{ borderColor: themeColors.border, color: themeColors.text, backgroundColor: themeColors.surface }}
        >
          <FaArrowLeft /> Back to Lots
        </button>
      </div>

      {/* Lot meta */}
      <div
        className="rounded-xl border p-4"
        style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold" style={{ color: themeColors.text }}>
              <FaGavel className="inline mr-2 opacity-80" />
              Bids for Lot: <span style={{ color: themeColors.primary }}>{lotId}</span>
            </h2>
            <p className="text-sm opacity-70" style={{ color: themeColors.text }}>
              {lotMeta ? (
                <>
                  {lotMeta.lotName} • {lotMeta.category} • Auction:{" "}
                  {lotMeta.auction?.auctionName || "-"} ({lotMeta.auction?.auctionId || "-"})
                </>
              ) : (
                "Loading lot details..."
              )}
            </p>
          </div>

          {/* stats */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: themeColors.border }}>
              Total Bids: <strong>{server.totalBids}</strong>
            </div>
            <div className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: themeColors.border }}>
              Highest: <strong>{highestBid ? `₹${fmtMoney(highestBid.amount)}` : "-"}</strong>
            </div>
            <div className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: themeColors.border }}>
              Last Bid:{" "}
              <strong>{bids[0]?.createdAt ? new Date(bids[0].createdAt).toLocaleString() : "-"}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div
        className="rounded-xl border p-3 md:p-4"
        style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* bidderId */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
            <input
              value={qBidder}
              onChange={(e) => setQBidder(e.target.value)}
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
                value={minAmt}
                onChange={(e) => setMinAmt(e.target.value)}
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
                value={maxAmt}
                onChange={(e) => setMaxAmt(e.target.value)}
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
                value={`${sortBy}:${sortDir}`}
                onChange={(e) => {
                  const [sb, sd] = e.target.value.split(":");
                  setSortBy(sb);
                  setSortDir(sd);
                }}
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}
              >
                <option value="amount:desc">Amount (High → Low)</option>
                <option value="amount:asc">Amount (Low → High)</option>
                <option value="date:desc">Date (Newest → Oldest)</option>
                <option value="date:asc">Date (Oldest → Newest)</option>
              </select>
              {sortDir === "desc" ? <FaSortAmountDownAlt /> : <FaSortAmountUpAlt />}
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
              {filteredBids.map((b) => (
                <tr key={b.bidId} style={{ backgroundColor: themeColors.surface }}>
                  <td className="px-6 py-4 text-sm" style={{ color: themeColors.text }}>
                    {b.bidId}
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: themeColors.text }}>
                    <FaUser className="inline mr-1 opacity-70" />
                    {b.bidderId}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold" style={{ color: themeColors.primary }}>
                    ₹{fmtMoney(b.amount)}
                  </td>
                  <td className="px-6 py-4 text-sm opacity-80" style={{ color: themeColors.text }}>
                    <FaCalendar className="inline mr-1 opacity-70" />
                    {fmtDateTime(b.createdAt)}
                  </td>
                </tr>
              ))}
              {filteredBids.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm" style={{ color: themeColors.text }}>
                    No bids match your filters.
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
          <div>Total bids (server): {server.totalBids}</div>
          <Pager />
        </div>
      </div>
    </div>
  );
};

/* ---------------------------
   Main Lots Page (with inline BidsPanel)
---------------------------- */
const Lots = () => {
  const { themeColors } = useTheme();

  // view + data
  const [viewMode, setViewMode] = useState("cards");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lots, setLots] = useState([]);

  // filters (server-driven)
  const [q, setQ] = useState("");              // maps to ?search
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterAuctionId, setFilterAuctionId] = useState("");
  const [filterSellerId, setFilterSellerId] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // pagination (client UI)
  const PER_PAGE_CARDS = 6;
  const PER_PAGE_TABLE = 8;
  const [pageCards, setPageCards] = useState(1);
  const [pageTable, setPageTable] = useState(1);

  // inline bids state
  const [bidsForLotId, setBidsForLotId] = useState(null); // when set → switch to BidsPanel
  const [bidsForLotMeta, setBidsForLotMeta] = useState(null);

  const fetchLots = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await listAdminLots({
        page: 1,
        limit: 200, // big enough, client paginate
        status: filterStatus,
        auctionId: filterAuctionId || undefined,
        sellerId: filterSellerId || undefined,
        category: filterCategory !== "All" ? filterCategory : undefined,
        minPrice: minPrice || undefined,
        maxPrice: maxPrice || undefined,
        search: q || undefined,
      });
      setLots(res?.lots || []);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to load lots.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
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

  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : "-");
  const fmtMoney = (n) =>
    typeof n === "number"
      ? n.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : n || "-";

  const totalCardsPages = Math.max(1, Math.ceil(lots.length / PER_PAGE_CARDS));
  const totalTablePages = Math.max(1, Math.ceil(lots.length / PER_PAGE_TABLE));
  const cardsSlice = useMemo(() => {
    const start = (pageCards - 1) * PER_PAGE_CARDS;
    return lots.slice(start, start + PER_PAGE_CARDS);
  }, [lots, pageCards]);
  const tableSlice = useMemo(() => {
    const start = (pageTable - 1) * PER_PAGE_TABLE;
    return lots.slice(start, start + PER_PAGE_TABLE);
  }, [lots, pageTable]);

  const StatsCards = useMemo(() => {
    const countBy = (st) => lots.filter((l) => l.status === st).length;
    const totals = {
      active: countBy("active"),
      sold: countBy("sold"),
      unsold: countBy("unsold"),
      cancelled: countBy("cancelled"),
    };
    const totalLots = lots.length;
    const totalImages = lots.reduce((a, l) => a + (l.imagesCount || 0), 0);
    return [
      { title: "Filtered Lots", value: String(totalLots), icon: FaBox, description: "Visible after filters" },
      { title: "Active", value: String(totals.active), icon: FaGavel, description: "Open for bidding" },
      { title: "Sold", value: String(totals.sold), icon: FaGavel, description: "Completed & sold" },
      { title: "Images (Total)", value: String(totalImages), icon: FaTags, description: "Assets across lots" },
    ];
  }, [lots, themeColors]);

  const Pager = ({ page, setPage, totalPages }) => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        disabled={page <= 1}
        className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50"
        style={{ borderColor: themeColors.border, color: themeColors.text, backgroundColor: themeColors.background }}
      >
        Previous
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          onClick={() => setPage(n)}
          className="px-3 py-1.5 rounded-lg border text-sm"
          style={{
            borderColor: n === page ? themeColors.primary : themeColors.border,
            color: n === page ? themeColors.primary : themeColors.text,
            backgroundColor: n === page ? themeColors.primary + "12" : themeColors.background,
            fontWeight: n === page ? 700 : 500,
          }}
        >
          {n}
        </button>
      ))}
      <button
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        disabled={page >= totalPages}
        className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50"
        style={{ borderColor: themeColors.border, color: themeColors.text, backgroundColor: themeColors.background }}
      >
        Next
      </button>
    </div>
  );

  // Loading & error
  if (loading && !bidsForLotId) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4" style={{ color: themeColors.text }}>
            Loading lots...
          </p>
        </div>
      </div>
    );
  }
  if (error && !bidsForLotId) {
    return (
      <div className="p-4 rounded-lg border" style={{ borderColor: themeColors.border, color: themeColors.danger }}>
        {error}
      </div>
    );
  }

  // If a lot is selected → show bids inline
  if (bidsForLotId) {
    return (
      <BidsPanel
        lotId={bidsForLotId}
        lotMeta={bidsForLotMeta}
        onBack={() => {
          setBidsForLotId(null);
          setBidsForLotMeta(null);
        }}
      />
    );
  }

  // Otherwise show LOTS UI
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: themeColors.text }}>
            📦 Lots (Admin)
          </h1>
          <p className="text-sm mt-1 opacity-75" style={{ color: themeColors.text }}>
            Search, filter and review all lots with auction metadata.
          </p>
        </div>

        {/* View toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("cards")}
            className={`p-3 rounded-lg border transition-all duration-200 flex items-center gap-2 ${
              viewMode === "cards" ? "ring-2 ring-opacity-40" : ""
            }`}
            style={{
              backgroundColor: viewMode === "cards" ? themeColors.primary + "15" : themeColors.surface,
              borderColor: viewMode === "cards" ? themeColors.primary : themeColors.border,
              color: viewMode === "cards" ? themeColors.primary : themeColors.text,
            }}
          >
            <FaTh />
            <span className="text-sm font-medium">Cards</span>
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`p-3 rounded-lg border transition-all duration-200 flex items-center gap-2 ${
              viewMode === "table" ? "ring-2 ring-opacity-40" : ""
            }`}
            style={{
              backgroundColor: viewMode === "table" ? themeColors.primary + "15" : themeColors.surface,
              borderColor: viewMode === "table" ? themeColors.primary : themeColors.border,
              color: viewMode === "table" ? themeColors.primary : themeColors.text,
            }}
          >
            <FaList />
            <span className="text-sm font-medium">Table</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border p-3 md:p-4" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
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

          {/* Status */}
          <div>
            <label className="text-xs mb-1 block opacity-70" style={{ color: themeColors.text }}>
              Status
            </label>
            <div className="flex items-center gap-2">
              <FaFilter className="opacity-70" />
              <select
                className="w-full p-2 rounded-lg border text-sm"
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPageCards(1);
                  setPageTable(1);
                }}
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}
              >
                <option value="all">All</option>
                {LOT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-xs mb-1 block opacity-70" style={{ color: themeColors.text }}>
              Category
            </label>
            <div className="flex items-center gap-2">
              <FaTags className="opacity-70" />
              <select
                className="w-full p-2 rounded-lg border text-sm"
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value);
                  setPageCards(1);
                  setPageTable(1);
                }}
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}
              >
                {allCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Auction ID */}
          <div>
            <label className="text-xs mb-1 block opacity-70" style={{ color: themeColors.text }}>
              Auction ID
            </label>
            <div className="flex items-center gap-2">
              <FaGavel className="opacity-70" />
              <input
                value={filterAuctionId}
                onChange={(e) => {
                  setFilterAuctionId(e.target.value);
                  setPageCards(1);
                  setPageTable(1);
                }}
                placeholder="e.g. AUC360NWEQET"
                className="w-full p-2 rounded-lg border text-sm"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}
              />
            </div>
          </div>

          {/* Seller ID */}
          <div>
            <label className="text-xs mb-1 block opacity-70" style={{ color: themeColors.text }}>
              Seller ID
            </label>
            <div className="flex items-center gap-2">
              <FaUser className="opacity-70" />
              <input
                value={filterSellerId}
                onChange={(e) => {
                  setFilterSellerId(e.target.value);
                  setPageCards(1);
                  setPageTable(1);
                }}
                placeholder="e.g. AUCNPGKTE6J4"
                className="w-full p-2 rounded-lg border text-sm"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}
              />
            </div>
          </div>

          {/* Min Price */}
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
                onChange={(e) => {
                  setMinPrice(e.target.value);
                  setPageCards(1);
                  setPageTable(1);
                }}
                placeholder="0"
                className="w-full p-2 rounded-lg border text-sm"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}
              />
            </div>
          </div>

          {/* Max Price */}
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
                onChange={(e) => {
                  setMaxPrice(e.target.value);
                  setPageCards(1);
                  setPageTable(1);
                }}
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
        {StatsCards.map((stat, idx) => (
          <div
            key={idx}
            className="p-6 rounded-xl border transition-all duration-300 hover:shadow-lg group"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-sm font-medium mb-1 opacity-75" style={{ color: themeColors.text }}>
                  {stat.title}
                </p>
                <p className="text-2xl font-bold mb-2" style={{ color: themeColors.primary }}>
                  {stat.value}
                </p>
                <p className="text-xs opacity-60" style={{ color: themeColors.text }}>
                  {stat.description}
                </p>
              </div>
              <div className="p-3 rounded-xl group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: themeColors.primary + "15" }}>
                <stat.icon className="text-lg" style={{ color: themeColors.primary }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cards View */}
      {viewMode === "cards" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cardsSlice.map((l) => {
              const auction = l.auction || null;
              return (
                <div
                  key={l.lotId}
                  className="rounded-xl border transition-all duration-300 hover:shadow-lg overflow-hidden"
                  style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
                >
                  {/* header */}
                  <div className="p-4 border-b" style={{ borderColor: themeColors.border }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-bold truncate" style={{ color: themeColors.text }}>
                          {l.lotName}
                        </h3>
                        <div className="text-xs opacity-60" style={{ color: themeColors.text }}>
                          {l.lotId} • {l.category}
                        </div>
                      </div>
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
                        style={{ backgroundColor: getStatusColor(l.status) + "25", color: getStatusColor(l.status) }}
                      >
                        {l.status}
                      </span>
                    </div>
                  </div>

                  {/* body */}
                  <div className="p-4 space-y-3">
                    <p className="text-sm" style={{ color: themeColors.text }}>
                      {l.description}
                    </p>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 rounded-lg" style={{ backgroundColor: themeColors.background }}>
                        <div className="text-xs opacity-70 mb-1" style={{ color: themeColors.text }}>
                          Start Price
                        </div>
                        <div className="text-sm font-bold" style={{ color: themeColors.primary }}>
                          ₹{fmtMoney(l.startPrice)}
                        </div>
                      </div>
                      <div className="text-center p-3 rounded-lg" style={{ backgroundColor: themeColors.background }}>
                        <div className="text-xs opacity-70 mb-1" style={{ color: themeColors.text }}>
                          Current Bid
                        </div>
                        <div className="text-sm font-bold" style={{ color: themeColors.primary }}>
                          ₹{fmtMoney(l.currentBid)}
                        </div>
                      </div>
                      <div className="text-center p-3 rounded-lg" style={{ backgroundColor: themeColors.background }}>
                        <div className="text-xs opacity-70 mb-1" style={{ color: themeColors.text }}>
                          Images
                        </div>
                        <div className="text-sm font-bold" style={{ color: themeColors.primary }}>
                          {l.imagesCount ?? (l.images?.length || 0)}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg p-3 border" style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}>
                      <div className="text-xs mb-1 opacity-70" style={{ color: themeColors.text }}>
                        Auction
                      </div>
                      <div className="text-sm font-medium" style={{ color: themeColors.text }}>
                        <FaGavel className="inline mr-1 opacity-70" /> {auction?.auctionName || "-"}
                      </div>
                      <div className="text-xs opacity-60" style={{ color: themeColors.text }}>
                        {auction?.auctionId || "-"} • {auction?.status || "-"} • {fmtDate(auction?.startDate)}–{fmtDate(auction?.endDate)}
                      </div>
                      <div className="text-xs opacity-60 mt-1" style={{ color: themeColors.text }}>
                        <FaUser className="inline mr-1 opacity-70" /> Seller: {l.sellerId || "-"}
                      </div>
                    </div>
                  </div>

                  {/* footer - View Bids */}
                  <div className="p-4 border-t" style={{ borderColor: themeColors.border }}>
                    <button
                      onClick={() => {
                        setBidsForLotId(l.lotId);
                        setBidsForLotMeta(l);
                      }}
                      className="px-3 py-2 rounded-lg text-sm font-semibold transition hover:opacity-90"
                      style={{ backgroundColor: themeColors.primary, color: themeColors.onPrimary }}
                    >
                      View Bids
                    </button>
                  </div>
                </div>
              );
            })}
            {cardsSlice.length === 0 && (
              <div
                className="col-span-full p-8 text-center rounded-xl border"
                style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border, color: themeColors.text }}
              >
                No lots for current filters.
              </div>
            )}
          </div>

          {/* Cards Pagination */}
          <div
            className="px-6 py-4 rounded-xl border flex items-center justify-between text-sm"
            style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface, color: themeColors.text }}
          >
            <div>
              Showing {(pageCards - 1) * PER_PAGE_CARDS + 1}–
              {Math.min(pageCards * PER_PAGE_CARDS, lots.length)} of {lots.length}
            </div>
            <Pager page={pageCards} setPage={setPageCards} totalPages={totalCardsPages} />
          </div>
        </>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <>
          <div
            className="rounded-2xl border shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: themeColors.background + "30" }}>
                    {[
                      "Lot",
                      "Lot ID",
                      "Category",
                      "Status",
                      "Start Price",
                      "Current Bid",
                      "Auction",
                      "Auction ID",
                      "Auction Status",
                      "Seller",
                      "Start",
                      "End",
                      "Images",
                      "Actions",
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
                  {tableSlice.map((l) => {
                    const a = l.auction || null;
                    return (
                      <tr key={l.lotId} style={{ backgroundColor: themeColors.surface }}>
                        <td className="px-6 py-4">
                          <div className="font-medium text-sm" style={{ color: themeColors.text }}>
                            {l.lotName}
                          </div>
                          <div className="text-xs opacity-70" style={{ color: themeColors.text }}>
                            {l.description}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm opacity-80" style={{ color: themeColors.text }}>
                          {l.lotId}
                        </td>
                        <td className="px-6 py-4 text-sm opacity-80" style={{ color: themeColors.text }}>
                          {l.category}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className="px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
                            style={{ backgroundColor: getStatusColor(l.status) + "25", color: getStatusColor(l.status) }}
                          >
                            {l.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm" style={{ color: themeColors.text }}>
                          ₹{fmtMoney(l.startPrice)}
                        </td>
                        <td className="px-6 py-4 text-sm" style={{ color: themeColors.text }}>
                          ₹{fmtMoney(l.currentBid)}
                        </td>
                        <td className="px-6 py-4 text-sm" style={{ color: themeColors.text }}>
                          {a?.auctionName || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm opacity-80" style={{ color: themeColors.text }}>
                          {a?.auctionId || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm" style={{ color: themeColors.text }}>
                          {a?.status || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm" style={{ color: themeColors.text }}>
                          {l.sellerId}
                        </td>
                        <td className="px-6 py-4 text-sm opacity-80" style={{ color: themeColors.text }}>
                          {fmtDate(a?.startDate)}
                        </td>
                        <td className="px-6 py-4 text-sm opacity-80" style={{ color: themeColors.text }}>
                          {fmtDate(a?.endDate)}
                        </td>
                        <td className="px-6 py-4 text-sm" style={{ color: themeColors.text }}>
                          {l.imagesCount ?? (l.images?.length || 0)}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => {
                              setBidsForLotId(l.lotId);
                              setBidsForLotMeta(l);
                            }}
                            className="px-3 py-2 rounded-lg text-xs font-semibold transition hover:opacity-90"
                            style={{ backgroundColor: themeColors.primary, color: themeColors.onPrimary }}
                          >
                            View Bids
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {tableSlice.length === 0 && (
                    <tr>
                      <td colSpan={13} className="px-6 py-10 text-center text-sm" style={{ color: themeColors.text }}>
                        No lots for current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table Pagination */}
          <div
            className="px-6 py-4 rounded-xl border flex items-center justify-between text-sm"
            style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface, color: themeColors.text }}
          >
            <div>
              Showing {(pageTable - 1) * PER_PAGE_TABLE + 1}–
              {Math.min(pageTable * PER_PAGE_TABLE, lots.length)} of {lots.length}
            </div>
            <Pager page={pageTable} setPage={setPageTable} totalPages={totalTablePages} />
          </div>
        </>
      )}
    </div>
  );
};

export default Lots;

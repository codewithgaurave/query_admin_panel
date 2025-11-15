// src/pages/Auctions.jsx
import { useEffect, useMemo, useState, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../context/ThemeContext";
import { toast } from "sonner";
import {
  FaSearch,
  FaFilter,
  FaTh,
  FaList,
  FaChevronDown,
  FaCheck,
  FaGavel,
  FaBox,
  FaCalendar,
  FaToggleOn,
  FaToggleOff,
  FaUser,
  FaTags,
} from "react-icons/fa";
import { listAuctions } from "../apis/auctions";

const AUCTION_STATUS = ["upcoming", "live", "completed", "cancelled"]; // backend abhi 2 bhej raha, future-proof
const CATEGORY_OPTIONS = ["All"]; // dynamic banayenge below

/* -------------------------------------------
   UI helpers: Badge + Portal Select (with flip)
------------------------------------------- */

const StatusBadge = ({ text, color }) => (
  <span
    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
    style={{ backgroundColor: color + "25", color }}
  >
    {text}
  </span>
);

// generic select rendered in portal (same behavior as Users.jsx ka StatusSelect)
const PortalSelect = ({
  themeColors,
  value,
  options,
  onChange,
  icon: Icon,
  disabled,
  size = "md", // 'sm' | 'md'
  getColor = () => themeColors.text,
  capitalize = true,
}) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const [menuRect, setMenuRect] = useState({ top: 0, left: 0, width: 0, place: "bottom" });

  const basePad = size === "sm" ? "px-2 py-1.5" : "px-3 py-2.5";
  const textSize = size === "sm" ? "text-xs" : "text-sm";
  const GAP = 8;
  const SIDE_PAD = 8;

  const updateMenuPosition = () => {
    const el = btnRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = rect.width;

    let place = "bottom";
    let top = rect.bottom + GAP;

    const approxMenuH = menuRef.current?.getBoundingClientRect()?.height ?? 220;
    const spaceBelow = window.innerHeight - rect.bottom - GAP;
    const spaceAbove = rect.top - GAP;

    if (spaceBelow < Math.min(approxMenuH, 220) && spaceAbove > spaceBelow) {
      place = "top";
      top = Math.max(GAP, rect.top - approxMenuH - GAP);
    }

    const left = Math.max(SIDE_PAD, Math.min(rect.left, window.innerWidth - width - SIDE_PAD));
    setMenuRect({ top, left, width, place });
  };

  useLayoutEffect(() => {
    if (open) updateMenuPosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => updateMenuPosition();
    const onScroll = () => updateMenuPosition();
    const onClickOutside = (e) => {
      if (!btnRef.current) return;
      if (!btnRef.current.contains(e.target) && !menuRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(updateMenuPosition);
    return () => cancelAnimationFrame(id);
  }, [open]);

  return (
    <div className="relative inline-block w-full">
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`w-full rounded-lg border flex items-center justify-between transition focus:outline-none focus:ring-2 ${basePad} ${textSize}`}
        style={{
          borderColor: open ? themeColors.primary : themeColors.border,
          backgroundColor: themeColors.background,
          color: themeColors.text,
          boxShadow: open ? `0 0 0 2px ${themeColors.primary}33 inset` : "none",
          zIndex: 1,
        }}
      >
        <span className="flex items-center gap-2 truncate">
          {!!Icon && <Icon className="opacity-80" style={{ color: getColor(value) }} />}
          <span className="truncate">{capitalize ? String(value).toLowerCase().replace(/^\w/, c => c.toUpperCase()) : value}</span>
        </span>
        <FaChevronDown
          className={`transition-transform ${open && menuRect.place === "bottom" ? "rotate-180" : ""}`}
          style={{ color: themeColors.text }}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="rounded-xl border shadow-lg overflow-auto"
            style={{
              position: "fixed",
              top: `${menuRect.top}px`,
              left: `${menuRect.left}px`,
              width: `${menuRect.width}px`,
              maxHeight: "40vh",
              zIndex: 9999,
              backgroundColor: themeColors.surface,
              borderColor: themeColors.border,
            }}
          >
            {options.map((opt) => {
              const active = opt === value;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition ${
                    active ? "font-semibold" : ""
                  } hover:opacity-90`}
                  style={{
                    color: themeColors.text,
                    backgroundColor: active ? themeColors.primary + "12" : themeColors.surface,
                  }}
                >
                  <span className="flex items-center gap-2">
                    {!!Icon && <Icon style={{ color: getColor(opt) }} />}
                    {opt}
                  </span>
                  {active && <FaCheck style={{ color: themeColors.primary }} />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
};

/* -------------------------------------------
                 Page Component
------------------------------------------- */

const Auctions = () => {
  const { themeColors } = useTheme();

  const [viewMode, setViewMode] = useState("cards");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [auctions, setAuctions] = useState([]);

  // filters
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [onlyActiveLots, setOnlyActiveLots] = useState(false);

  // pagination (client-side, Users.jsx ki tarah)
  const PER_PAGE_CARDS = 6;
  const PER_PAGE_TABLE = 5;
  const [pageCards, setPageCards] = useState(1);
  const [pageTable, setPageTable] = useState(1);

  // fetch auctions
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await listAuctions({ page: 1, limit: 200 }); // pull enough, then client-filter
        if (mounted) setAuctions(res?.auctions || []);
      } catch (err) {
        const msg = err?.response?.data?.message || err?.message || "Failed to load auctions.";
        setError(msg);
        toast.error(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // compute dynamic category options
  const allCategories = useMemo(() => {
    const set = new Set(auctions.map((a) => a.category).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [auctions]);

  // helpers
  const getStatusColor = (status) => {
    const s = String(status || "").toLowerCase();
    const map = {
      live: themeColors.success,
      upcoming: themeColors.info,
      completed: themeColors.text, // neutral
      cancelled: themeColors.danger,
    };
    return map[s] || themeColors.text;
  };

  // FILTER + SEARCH
  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return auctions.filter((a) => {
      const statusOk = filterStatus === "All" ? true : a.status === filterStatus;
      const categoryOk = filterCategory === "All" ? true : a.category === filterCategory;

      const activeLotsCount = (a.lots || []).filter((l) => String(l.status).toLowerCase() === "active").length;
      const activeOk = !onlyActiveLots ? true : activeLotsCount > 0;

      const searchOk =
        !ql ||
        [a.auctionName, a.auctionId, a.sellerName, a?.seller?.email, a?.seller?.userId]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(ql));

      return statusOk && categoryOk && activeOk && searchOk;
    });
  }, [auctions, q, filterStatus, filterCategory, onlyActiveLots]);

  // RESET PAGE on filters/viewMode change
  useEffect(() => {
    setPageCards(1);
    setPageTable(1);
  }, [q, filterStatus, filterCategory, onlyActiveLots, viewMode]);

  // PAGINATION slices
  const totalCardsPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE_CARDS));
  const totalTablePages = Math.max(1, Math.ceil(filtered.length / PER_PAGE_TABLE));

  const cardsSlice = useMemo(() => {
    const start = (pageCards - 1) * PER_PAGE_CARDS;
    return filtered.slice(start, start + PER_PAGE_CARDS);
  }, [filtered, pageCards]);

  const tableSlice = useMemo(() => {
    const start = (pageTable - 1) * PER_PAGE_TABLE;
    return filtered.slice(start, start + PER_PAGE_TABLE);
  }, [filtered, pageTable]);

  // Stats (for filtered set)
  const StatsCards = useMemo(() => {
    const total = filtered.length;
    const countBy = (st) => filtered.filter((a) => a.status === st).length;
    const totalLots = filtered.reduce((acc, a) => acc + (a.totalLots || (a.lots?.length || 0)), 0);
    const activeLots = filtered.reduce(
      (acc, a) => acc + (a.lots || []).filter((l) => String(l.status).toLowerCase() === "active").length,
      0
    );

    return [
      { title: "Filtered Auctions", value: String(total), icon: FaGavel, description: "Visible after filters" },
      { title: "Live", value: String(countBy("live")), icon: FaGavel, description: "Currently running" },
      { title: "Upcoming", value: String(countBy("upcoming")), icon: FaCalendar, description: "Starting soon" },
      { title: "Lots (Total / Active)", value: `${totalLots} / ${activeLots}`, icon: FaBox, description: "Sum across filtered" },
    ];
  }, [filtered, themeColors]);

  // UI blocks
  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4" style={{ color: themeColors.text }}>
            Loading auctions...
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

  // Pagination component
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

  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : "-");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: themeColors.text }}>
            🏷️ Auctions
          </h1>
          <p className="text-sm mt-1 opacity-75" style={{ color: themeColors.text }}>
            Search, filter and browse auctions with lots & sellers.
          </p>
        </div>

        {/* View Toggle */}
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
      <div
        className="rounded-xl border p-3 md:p-4"
        style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
      >
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          {/* Search */}
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by auction name, ID, seller name/email"
              className="w-full pl-9 pr-3 py-2 rounded-lg border"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}
            />
          </div>

          {/* Status */}
          <div className="min-w-[200px]">
            <label className="text-xs mb-1 block opacity-70" style={{ color: themeColors.text }}>
              Status
            </label>
            <PortalSelect
              themeColors={themeColors}
              value={filterStatus}
              options={["All", ...AUCTION_STATUS]}
              onChange={setFilterStatus}
              icon={FaGavel}
              getColor={(v) => (v === "live" ? themeColors.success : v === "upcoming" ? themeColors.info : v === "cancelled" ? themeColors.danger : themeColors.text)}
              capitalize={false}
            />
          </div>

          {/* Category */}
          <div className="min-w-[200px]">
            <label className="text-xs mb-1 block opacity-70" style={{ color: themeColors.text }}>
              Category
            </label>
            <PortalSelect
              themeColors={themeColors}
              value={filterCategory}
              options={allCategories}
              onChange={setFilterCategory}
              icon={FaTags}
              getColor={() => themeColors.text}
              capitalize={false}
            />
          </div>

          {/* Active lots toggle */}
          <div className="min-w-[220px]">
            <label className="text-xs mb-1 block opacity-70" style={{ color: themeColors.text }}>
              Only Active Lots
            </label>
            <button
              onClick={() => setOnlyActiveLots((v) => !v)}
              className="w-full p-2 rounded-lg border flex items-center justify-between"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.background, color: themeColors.text }}
            >
              <span className="text-sm">Show auctions with active lots</span>
              {onlyActiveLots ? <FaToggleOn style={{ color: themeColors.success }} /> : <FaToggleOff />}
            </button>
          </div>
        </div>
      </div>

      {/* Stats (for filtered set) */}
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
              <div
                className="p-3 rounded-xl group-hover:scale-110 transition-transform duration-300"
                style={{ backgroundColor: themeColors.primary + "15" }}
              >
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
            {cardsSlice.map((a) => {
              const activeLotsCount = (a.lots || []).filter((l) => String(l.status).toLowerCase() === "active").length;
              return (
                <div
                  key={a._id}
                  className="rounded-xl border transition-all duration-300 hover:shadow-lg overflow-hidden group"
                  style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
                >
                  {/* Header */}
                  <div className="p-4 flex items-center gap-3 border-b" style={{ borderColor: themeColors.border }}>
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center font-semibold text-base shadow-sm"
                      style={{ backgroundColor: themeColors.primary + "25", color: themeColors.primary }}
                    >
                      <FaGavel />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold truncate" style={{ color: themeColors.text }}>
                        {a.auctionName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge text={a.status} color={getStatusColor(a.status)} />
                        <span className="text-xs opacity-60" style={{ color: themeColors.text }}>
                          {a.auctionId} • {a.category}
                        </span>
                      </div>
                      <p className="text-xs opacity-60 mt-1" style={{ color: themeColors.text }}>
                        Seller: {a.sellerName || a?.seller?.name || "-"} <span className="opacity-40">|</span>{" "}
                        <FaUser className="inline -mt-0.5 mr-1 opacity-70" /> {a?.seller?.email || "-"}
                      </p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: themeColors.primary + "15" }}>
                        <FaCalendar className="text-xs" style={{ color: themeColors.primary }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs opacity-60" style={{ color: themeColors.text }}>
                          {fmtDate(a.startDate)} {a.startTime ? `• ${a.startTime}` : ""} – {fmtDate(a.endDate)}{" "}
                          {a.endTime ? `• ${a.endTime}` : ""}
                        </p>
                        <p className="text-sm font-medium" style={{ color: themeColors.text }}>
                          {a.description}
                        </p>
                      </div>
                    </div>

                    {/* Lots summary */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 rounded-lg" style={{ backgroundColor: themeColors.background }}>
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <FaBox className="text-xs opacity-70" style={{ color: themeColors.text }} />
                          <span className="text-sm font-bold" style={{ color: themeColors.primary }}>
                            {a.totalLots ?? a.lots?.length ?? 0}
                          </span>
                        </div>
                        <p className="text-xs opacity-60" style={{ color: themeColors.text }}>
                          Total Lots
                        </p>
                      </div>
                      <div className="text-center p-3 rounded-lg" style={{ backgroundColor: themeColors.background }}>
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <FaGavel className="text-xs opacity-70" style={{ color: themeColors.text }} />
                          <span className="text-sm font-bold" style={{ color: themeColors.primary }}>
                            {activeLotsCount}
                          </span>
                        </div>
                        <p className="text-xs opacity-60" style={{ color: themeColors.text }}>
                          Active Lots
                        </p>
                      </div>
                      <div className="text-center p-3 rounded-lg" style={{ backgroundColor: themeColors.background }}>
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <FaTags className="text-xs opacity-70" style={{ color: themeColors.text }} />
                          <span className="text-sm font-bold" style={{ color: themeColors.primary }}>
                            {a.category || "-"}
                          </span>
                        </div>
                        <p className="text-xs opacity-60" style={{ color: themeColors.text }}>
                          Category
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {cardsSlice.length === 0 && (
              <div
                className="col-span-full p-8 text-center rounded-xl border"
                style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border, color: themeColors.text }}
              >
                No auctions for current filters.
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
              {Math.min(pageCards * PER_PAGE_CARDS, filtered.length)} of {filtered.length}
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
                      "Auction",
                      "Auction ID",
                      "Seller",
                      "Email",
                      "Category",
                      "Status",
                      "Lots (Total)",
                      "Lots (Active)",
                      "Start",
                      "End",
                    ].map((head) => (
                      <th
                        key={head}
                        className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                        style={{ color: themeColors.text }}
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: themeColors.border }}>
                  {tableSlice.map((a) => {
                    const activeLotsCount = (a.lots || []).filter((l) => String(l.status).toLowerCase() === "active").length;
                    return (
                      <tr key={a._id} style={{ backgroundColor: themeColors.surface }}>
                        <td className="px-6 py-4">
                          <div className="font-medium text-sm" style={{ color: themeColors.text }}>
                            {a.auctionName}
                          </div>
                          <div className="text-xs opacity-70" style={{ color: themeColors.text }}>
                            {a.description}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm opacity-80" style={{ color: themeColors.text }}>
                          {a.auctionId}
                        </td>
                        <td className="px-6 py-4 text-sm opacity-80" style={{ color: themeColors.text }}>
                          {a.sellerName || a?.seller?.name || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm opacity-80" style={{ color: themeColors.text }}>
                          {a?.seller?.email || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm opacity-80" style={{ color: themeColors.text }}>
                          {a.category}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge text={a.status} color={getStatusColor(a.status)} />
                        </td>
                        <td className="px-6 py-4 text-sm" style={{ color: themeColors.text }}>
                          {a.totalLots ?? a.lots?.length ?? 0}
                        </td>
                        <td className="px-6 py-4 text-sm" style={{ color: themeColors.text }}>
                          {activeLotsCount}
                        </td>
                        <td className="px-6 py-4 text-sm opacity-80" style={{ color: themeColors.text }}>
                          {fmtDate(a.startDate)} {a.startTime ? `• ${a.startTime}` : ""}
                        </td>
                        <td className="px-6 py-4 text-sm opacity-80" style={{ color: themeColors.text }}>
                          {fmtDate(a.endDate)} {a.endTime ? `• ${a.endTime}` : ""}
                        </td>
                      </tr>
                    );
                  })}
                  {tableSlice.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-6 py-10 text-center text-sm" style={{ color: themeColors.text }}>
                        No auctions for current filters.
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
            style={{
              borderColor: themeColors.border,
              backgroundColor: themeColors.surface,
              color: themeColors.text,
            }}
          >
            <div>
              Showing {(pageTable - 1) * PER_PAGE_TABLE + 1}–
              {Math.min(pageTable * PER_PAGE_TABLE, filtered.length)} of {filtered.length}
            </div>
            <Pager page={pageTable} setPage={setPageTable} totalPages={totalTablePages} />
          </div>
        </>
      )}
    </div>
  );
};

export default Auctions;


// src/pages/Punchins.jsx
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  FaMapMarkerAlt,
  FaSearch,
  FaUser,
  FaRegClock,
  FaImage,
} from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import { getAllPunchHistory } from "../apis/punchins";

const fmtDateTime = (d) => {
  if (!d) return "-";
  try {
    const dt = new Date(d);
    return `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } catch {
    return "-";
  }
};

export default function Punchins() {
  const { themeColors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [punches, setPunches] = useState([]);
  const [search, setSearch] = useState("");

  const loadPunches = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getAllPunchHistory();
      setPunches(res.punches || []);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load punch-in history.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPunches();
  }, []);

  const filteredPunches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return punches;

    return punches.filter((p) => {
      const user = p.user || {};
      const fields = [
        user.fullName,
        user.userCode,
        user.mobile,
        p.userCode,
      ].filter(Boolean);

      return fields.some((v) => String(v).toLowerCase().includes(q));
    });
  }, [punches, search]);

  // ---- Loading & error ----
  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-4" style={{ color: themeColors.text }}>
            Loading punch-in history...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-4 rounded-lg border"
        style={{
          borderColor: themeColors.border,
          color: themeColors.danger,
          backgroundColor: themeColors.surface,
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1
            className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2"
            style={{ color: themeColors.text }}
          >
            <FaMapMarkerAlt />
            Punch-ins
          </h1>
          <p
            className="text-sm mt-1 opacity-75"
            style={{ color: themeColors.text }}
          >
            Sabhi survey users ke punch-in records dekho – location, photo aur
            time ke saath.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div
        className="rounded-xl border p-3 md:p-4 shadow-sm"
        style={{
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
        }}
      >
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          {/* Search */}
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by user name, code, mobile"
              className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm"
              style={{
                borderColor: themeColors.border,
                backgroundColor: themeColors.background,
                color: themeColors.text,
              }}
            />
          </div>

          <div className="text-xs opacity-70 md:text-right">
            <span style={{ color: themeColors.text }}>
              Total Punch-ins:{" "}
              <span className="font-semibold">{punches.length}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl border shadow-sm overflow-hidden"
        style={{
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: themeColors.background + "30" }}>
                {[
                  "#",
                  "User",
                  "User Code",
                  "Mobile",
                  "Photo",
                  "Location",
                  "Date / Time",
                ].map((head) => (
                  <th
                    key={head}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: themeColors.text }}
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody
              className="divide-y"
              style={{ borderColor: themeColors.border }}
            >
              {filteredPunches.map((p, idx) => {
                const user = p.user || {};
                const hasLocation =
                  p.latitude !== undefined &&
                  p.latitude !== null &&
                  p.longitude !== undefined &&
                  p.longitude !== null;

                return (
                  <tr key={p._id || idx}>
                    {/* # */}
                    <td
                      className="px-4 py-3 text-xs opacity-70"
                      style={{ color: themeColors.text }}
                    >
                      {idx + 1}
                    </td>

                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{
                            backgroundColor: themeColors.background,
                            color: themeColors.text,
                          }}
                        >
                          {(user.fullName || user.userCode || "?")
                            .toUpperCase()
                            .charAt(0)}
                        </div>
                        <div>
                          <div
                            className="text-sm font-medium flex items-center gap-1"
                            style={{ color: themeColors.text }}
                          >
                            <FaUser className="opacity-70" />
                            <span>{user.fullName || "-"}</span>
                          </div>
                          <div
                            className="text-[11px] opacity-70"
                            style={{ color: themeColors.text }}
                          >
                            {user.role || "SURVEY_USER"}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* User code */}
                    <td
                      className="px-4 py-3 text-xs font-mono"
                      style={{ color: themeColors.text }}
                    >
                      {user.userCode || p.userCode || "-"}
                    </td>

                    {/* Mobile */}
                    <td
                      className="px-4 py-3 text-xs"
                      style={{ color: themeColors.text }}
                    >
                      {user.mobile || "-"}
                    </td>

                    {/* Photo */}
                    <td className="px-4 py-3">
                      {p.photoUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            window.open(p.photoUrl, "_blank", "noopener,noreferrer")
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px]"
                          style={{
                            borderColor: themeColors.border,
                            backgroundColor: themeColors.background,
                            color: themeColors.text,
                          }}
                        >
                          <FaImage />
                          View Photo
                        </button>
                      ) : (
                        <span
                          className="text-xs opacity-60"
                          style={{ color: themeColors.text }}
                        >
                          -
                        </span>
                      )}
                    </td>

                    {/* Location */}
                    <td className="px-4 py-3 text-xs">
                      {hasLocation ? (
                        <button
                          type="button"
                          onClick={() => {
                            const url = `https://www.google.com/maps?q=${p.latitude},${p.longitude}`;
                            window.open(url, "_blank", "noopener,noreferrer");
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px]"
                          style={{
                            borderColor: themeColors.primary,
                            backgroundColor: themeColors.background,
                            color: themeColors.primary,
                          }}
                        >
                          <FaMapMarkerAlt />
                          View Map
                          <span className="opacity-70">
                            ({Number(p.latitude).toFixed(4)},{" "}
                            {Number(p.longitude).toFixed(4)})
                          </span>
                        </button>
                      ) : (
                        <span
                          className="text-xs opacity-60"
                          style={{ color: themeColors.text }}
                        >
                          -
                        </span>
                      )}
                    </td>

                    {/* Date / time */}
                    <td className="px-4 py-3">
                      <div
                        className="flex items-center gap-1 text-xs"
                        style={{ color: themeColors.text }}
                      >
                        <FaRegClock className="opacity-70" />
                        <span>{fmtDateTime(p.createdAt)}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredPunches.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm"
                    style={{ color: themeColors.text }}
                  >
                    No punch-ins found for current search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

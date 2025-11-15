// src/pages/Dashboard.jsx
import { useState, useEffect, useMemo } from "react";
import { useTheme } from "../context/ThemeContext";
import {
  FaUsers,
  FaUserCheck,
  FaUserTie,
  FaClipboardList,
  FaPoll,
  FaChartBar,
  FaSyncAlt,
} from "react-icons/fa";
import { getAdminDashboard } from "../apis/dashboard";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

// ---------- helpers ----------
const fmtNum = (n) =>
  typeof n === "number" ? n.toLocaleString("en-IN") : n ?? "-";
const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString() : "-";

const mapTrend = (arr = []) =>
  arr.map((d) => ({
    date: fmtDate(d.date),
    count: d.count,
  }));

const LoadingCard = ({ themeColors, height = 120 }) => (
  <div
    className="rounded-xl border animate-pulse"
    style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border, height }}
  />
);

export default function Dashboard() {
  const { themeColors } = useTheme();

  const [range, setRange] = useState("30d"); // "7d" | "30d" | "90d" | "180d"
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setErr("");
      const res = await getAdminDashboard({ range });
      setData(res);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  // ---- DERIVED DATA ----
  const summary = data?.summary;
  const trends = data?.trends;
  const surveyPerformance = data?.surveyPerformance || [];
  const surveyUserActivity = data?.surveyUserActivity || [];

  const punchTrend = useMemo(
    () => mapTrend(trends?.punchInsDaily || []),
    [trends]
  );
  const responseTrend = useMemo(
    () => mapTrend(trends?.responsesDaily || []),
    [trends]
  );
  const surveyPerfBarData = useMemo(
    () =>
      (surveyPerformance || []).map((s) => ({
        name: s.name,
        responses: s.totalResponses,
      })),
    [surveyPerformance]
  );

  const summaryCards = useMemo(() => {
    if (!summary) return [];
    return [
      {
        title: "Total Users",
        value: fmtNum(summary.users.total),
        icon: FaUsers,
        description: `${fmtNum(summary.users.active)} active • ${fmtNum(
          summary.users.inactive
        )} inactive`,
      },
      {
        title: "Survey Users",
        value: fmtNum(summary.users.surveyUsers),
        icon: FaUserCheck,
        description: "Field survey users",
      },
      {
        title: "Surveys",
        value: fmtNum(summary.surveys.total),
        icon: FaClipboardList,
        description: `${fmtNum(summary.surveys.active)} active • ${fmtNum(
          summary.surveys.closed
        )} closed`,
      },
      {
        title: "Responses",
        value: fmtNum(summary.responses.total),
        icon: FaPoll,
        description: `Today: ${fmtNum(summary.responses.today)}`,
      },
    ];
  }, [summary]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: themeColors.text }}>
            Survey Operations Dashboard
          </h1>
          <p className="text-sm mt-1 opacity-75" style={{ color: themeColors.text }}>
            Field survey, responses, and punch-in overview
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="px-3 py-2 rounded-lg border text-sm"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border, color: themeColors.text }}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="180d">Last 180 days</option>
          </select>
          <button
            onClick={fetchData}
            className="px-3 py-2 rounded-lg border text-sm flex items-center gap-2"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border, color: themeColors.text }}
            title="Refresh"
          >
            <FaSyncAlt className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Errors */}
      {err && (
        <div
          className="p-3 rounded-lg border text-sm"
          style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border, color: themeColors.text }}
        >
          {err}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading && !data
          ? Array.from({ length: 4 }).map((_, i) => (
              <LoadingCard key={i} themeColors={themeColors} />
            ))
          : summaryCards.map((stat, index) => (
              <div
                key={index}
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

      {/* Charts Row 1: Punch-ins & Responses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Punch-ins per day */}
        <div
          className="p-6 rounded-xl border"
          style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
        >
          <h2
            className="text-lg font-semibold mb-4 flex items-center justify-between"
            style={{ color: themeColors.text }}
          >
            <span className="flex items-center gap-2">
              <FaChartBar />
              Punch-ins per Day
            </span>
            {summary && (
              <span className="text-xs opacity-70">
                Today: {fmtNum(summary.punchIns.today)} • Total:{" "}
                {fmtNum(summary.punchIns.total)}
              </span>
            )}
          </h2>
          <div style={{ width: "100%", height: 280 }}>
            {loading && !data ? (
              <LoadingCard themeColors={themeColors} height={240} />
            ) : (
              <ResponsiveContainer>
                <LineChart data={punchTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Responses per day */}
        <div
          className="p-6 rounded-xl border"
          style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
        >
          <h2
            className="text-lg font-semibold mb-4 flex items-center justify-between"
            style={{ color: themeColors.text }}
          >
            <span className="flex items-center gap-2">
              <FaChartBar />
              Survey Responses per Day
            </span>
            {summary && (
              <span className="text-xs opacity-70">
                Today: {fmtNum(summary.responses.today)} • Total:{" "}
                {fmtNum(summary.responses.total)}
              </span>
            )}
          </h2>
          <div style={{ width: "100%", height: 280 }}>
            {loading && !data ? (
              <LoadingCard themeColors={themeColors} height={240} />
            ) : (
              <ResponsiveContainer>
                <LineChart data={responseTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#82ca9d" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Chart Row 2: Responses per survey */}
      <div
        className="p-6 rounded-xl border"
        style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
      >
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: themeColors.text }}>
          <FaChartBar />
          Responses per Survey
        </h2>
        <div style={{ width: "100%", height: 280 }}>
          {loading && !data ? (
            <LoadingCard themeColors={themeColors} height={240} />
          ) : (
            <ResponsiveContainer>
              <BarChart data={surveyPerfBarData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide={surveyPerfBarData.length > 8} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="responses" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        {!loading && surveyPerfBarData.length === 0 && (
          <p className="text-xs mt-3 opacity-70" style={{ color: themeColors.text }}>
            No responses yet.
          </p>
        )}
      </div>

      {/* Tables: Survey performance & Surveyor activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Survey performance table */}
        <div
          className="p-6 rounded-xl border"
          style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: themeColors.text }}>
            <FaClipboardList />
            Survey Performance
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: themeColors.background + "30" }}>
                  {["Survey", "Code", "Status", "Responses", "Last Response"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide"
                      style={{ color: themeColors.text }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: themeColors.border }}>
                {loading && !data
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={5}>
                          <LoadingCard themeColors={themeColors} height={40} />
                        </td>
                      </tr>
                    ))
                  : surveyPerformance.map((s) => (
                      <tr key={s.surveyId}>
                        <td className="px-4 py-2" style={{ color: themeColors.text }}>
                          {s.name}
                        </td>
                        <td className="px-4 py-2" style={{ color: themeColors.text }}>
                          {s.surveyCode}
                        </td>
                        <td className="px-4 py-2" style={{ color: themeColors.text }}>
                          {s.status}
                        </td>
                        <td className="px-4 py-2 font-semibold" style={{ color: themeColors.primary }}>
                          {fmtNum(s.totalResponses)}
                        </td>
                        <td className="px-4 py-2 text-xs opacity-70" style={{ color: themeColors.text }}>
                          {fmtDate(s.lastResponseAt)}
                        </td>
                      </tr>
                    ))}
                {!loading && surveyPerformance.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-sm"
                      style={{ color: themeColors.text }}
                    >
                      No survey responses yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Surveyor activity table */}
        <div
          className="p-6 rounded-xl border"
          style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: themeColors.text }}>
            <FaUserTie />
            Surveyor Activity
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: themeColors.background + "30" }}>
                  {["User", "Code", "Responses", "Punch-ins", "Last Activity"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide"
                        style={{ color: themeColors.text }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: themeColors.border }}>
                {loading && !data
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={5}>
                          <LoadingCard themeColors={themeColors} height={40} />
                        </td>
                      </tr>
                    ))
                  : surveyUserActivity.map((u) => (
                      <tr key={u.userCode}>
                        <td className="px-4 py-2" style={{ color: themeColors.text }}>
                          {u.userName || "-"}
                          <div className="text-xs opacity-60">
                            {u.mobile}
                          </div>
                        </td>
                        <td className="px-4 py-2" style={{ color: themeColors.text }}>
                          {u.userCode}
                        </td>
                        <td className="px-4 py-2 font-semibold" style={{ color: themeColors.primary }}>
                          {fmtNum(u.totalResponses)}
                        </td>
                        <td className="px-4 py-2" style={{ color: themeColors.text }}>
                          {fmtNum(u.totalPunchIns)}
                        </td>
                        <td className="px-4 py-2 text-xs opacity-70" style={{ color: themeColors.text }}>
                          {fmtDate(u.lastActivityAt)}
                        </td>
                      </tr>
                    ))}
                {!loading && surveyUserActivity.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-sm"
                      style={{ color: themeColors.text }}
                    >
                      No surveyor activity yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

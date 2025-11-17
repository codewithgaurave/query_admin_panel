// src/pages/SurveyCharts.jsx
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  FaClipboardList,
  FaSearch,
  FaPlay,
  FaRegClock,
  FaStopCircle,
  FaChartBar,
} from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import { listAllPublicSurveyResponses } from "../apis/surveyPublic";

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";

// register chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

// small util
const fmtPercent = (v) => `${v.toFixed(2)} %`;

// ---------- per-question chart component ----------
function QuestionChart({ qStat, themeColors }) {
  const { questionText, total, options } = qStat;
  const [chartType, setChartType] = useState("bar"); // "bar" | "pie"

  const labels = options.map((o) => o.label || "–");
  const counts = options.map((o) => o.count);

  // Softer, modern palette
  const palette = [
    themeColors.primary,
    themeColors.success,
    "#0EA5E9", // sky-500
    "#F97316", // orange-500
    "#22C55E", // green-500
    "#A855F7", // violet-500
    "#E11D48", // rose-600
  ];

  const backgroundColors = labels.map(
    (_, idx) => palette[idx % palette.length] || themeColors.primary
  );

  const chartData = {
    labels,
    datasets: [
      {
        label: "Responses",
        data: counts,
        backgroundColor: backgroundColors,
        borderRadius: 8,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: themeColors.text,
          boxWidth: 12,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.parsed.y} responses`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: themeColors.text, font: { size: 12 } },
        grid: { display: false },
      },
      y: {
        ticks: { color: themeColors.text, font: { size: 12 } },
        grid: { color: themeColors.border + "80" },
        beginAtZero: true,
      },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: themeColors.text,
          boxWidth: 12,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const value = ctx.raw ?? 0;
            const total = counts.reduce((s, v) => s + v, 0);
            const percent = total ? ((value * 100) / total).toFixed(1) : 0;
            return ` ${value} (${percent}%)`;
          },
        },
      },
    },
  };

  return (
    <div
      className="rounded-2xl border p-4 md:p-5 space-y-4 shadow-sm"
      style={{
        borderColor: themeColors.border,
        backgroundColor: themeColors.surface,
      }}
    >
      {/* Question heading + chart type toggle */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-1 text-base">☑</span>
          <div>
            <p
              className="font-semibold text-base md:text-lg leading-snug"
              style={{ color: themeColors.text }}
            >
              {questionText}
            </p>
            <p
              className="text-xs md:text-sm mt-1 opacity-80"
              style={{ color: themeColors.text }}
            >
              Total Responses:{" "}
              <span className="font-semibold">{total}</span>
            </p>
          </div>
        </div>

        <div className="inline-flex items-center text-xs md:text-sm gap-2">
          <span style={{ color: themeColors.text }} className="opacity-80">
            Chart Type:
          </span>
          <div
            className="inline-flex rounded-full border p-0.5 bg-black/5"
            style={{ borderColor: themeColors.border }}
          >
            <button
              type="button"
              onClick={() => setChartType("bar")}
              className={`px-3 py-1.5 rounded-full transition-all ${
                chartType === "bar"
                  ? "text-sm font-semibold shadow-sm"
                  : "text-xs"
              }`}
              style={{
                backgroundColor:
                  chartType === "bar" ? themeColors.primary : "transparent",
                color:
                  chartType === "bar" ? "#ffffff" : themeColors.text,
              }}
            >
              Bar
            </button>
            <button
              type="button"
              onClick={() => setChartType("pie")}
              className={`px-3 py-1.5 rounded-full transition-all ${
                chartType === "pie"
                  ? "text-sm font-semibold shadow-sm"
                  : "text-xs"
              }`}
              style={{
                backgroundColor:
                  chartType === "pie" ? themeColors.primary : "transparent",
                color:
                  chartType === "pie" ? "#ffffff" : themeColors.text,
              }}
            >
              Pie
            </button>
          </div>
        </div>
      </div>

      {/* Chart area */}
      <div className="mt-2 w-full overflow-x-auto">
        <div className="min-w-[280px] h-72 md:h-80">
          {chartType === "bar" ? (
            <Bar options={barOptions} data={chartData} />
          ) : (
            <Pie options={pieOptions} data={chartData} />
          )}
        </div>
      </div>

      {/* Table like screenshot */}
      <div className="mt-4 border rounded-xl overflow-hidden text-xs md:text-sm">
        <table className="w-full">
          <thead
            style={{
              backgroundColor: themeColors.background,
            }}
          >
            <tr>
              <th className="px-3 md:px-4 py-2 md:py-2.5 text-left">
                Response
              </th>
              <th className="px-3 md:px-4 py-2 md:py-2.5 text-right">
                Responses
              </th>
              <th className="px-3 md:px-4 py-2 md:py-2.5 text-right">
                Percent
              </th>
            </tr>
          </thead>
          <tbody>
            {options.map((opt) => (
              <tr key={opt.label}>
                <td
                  className="px-3 md:px-4 py-2 border-t"
                  style={{ borderColor: themeColors.border }}
                >
                  {opt.label || "–"}
                </td>
                <td
                  className="px-3 md:px-4 py-2 border-t text-right"
                  style={{ borderColor: themeColors.border }}
                >
                  {opt.count}
                </td>
                <td
                  className="px-3 md:px-4 py-2 border-t text-right"
                  style={{ borderColor: themeColors.border }}
                >
                  {fmtPercent(opt.percent)}
                </td>
              </tr>
            ))}
            <tr>
              <td
                className="px-3 md:px-4 py-2 border-t font-semibold"
                style={{ borderColor: themeColors.border }}
              >
                Total
              </td>
              <td
                className="px-3 md:px-4 py-2 border-t text-right font-semibold"
                style={{ borderColor: themeColors.border }}
              >
                {total}
              </td>
              <td
                className="px-3 md:px-4 py-2 border-t text-right font-semibold"
                style={{ borderColor: themeColors.border }}
              >
                100.00 %
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// aggregate all responses of a survey into per-question stats
function buildQuestionStats(survey) {
  const responses = survey?.responses || [];
  const map = new Map();

  responses.forEach((resp) => {
    (resp.answers || []).forEach((a) => {
      // open ended skip (warna bohot unique values ho jayenge)
      if (a.questionType === "OPEN_ENDED") return;

      const key = a.questionId || a.questionText || `q-${map.size}`;
      if (!map.has(key)) {
        map.set(key, {
          questionId: a.questionId,
          questionText: a.questionText || "Untitled Question",
          counts: {},
          total: 0,
        });
      }
      const qStat = map.get(key);

      if (a.questionType === "RATING") {
        const label =
          typeof a.rating === "number" ? String(a.rating) : "No Rating";
        qStat.counts[label] = (qStat.counts[label] || 0) + 1;
        qStat.total += 1;
      } else {
        // MCQ / checkbox etc
        const opts =
          a.selectedOptions && a.selectedOptions.length
            ? a.selectedOptions
            : ["No Answer"];
        opts.forEach((opt) => {
          qStat.counts[opt] = (qStat.counts[opt] || 0) + 1;
          qStat.total += 1;
        });
      }
    });
  });

  // convert map -> array with percent
  return Array.from(map.values()).map((q) => {
    const options = Object.entries(q.counts).map(([label, count]) => ({
      label,
      count,
      percent: q.total ? (count * 100) / q.total : 0,
    }));
    return { ...q, options };
  });
}

// ---------- MAIN PAGE ----------
export default function SurveyCharts() {
  const { themeColors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [surveys, setSurveys] = useState([]); // from listAllPublicSurveyResponses
  const [search, setSearch] = useState("");
  const [selectedSurveyId, setSelectedSurveyId] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await listAllPublicSurveyResponses();
      const list = res.surveys || [];
      setSurveys(list);
      if (list.length && !selectedSurveyId) {
        setSelectedSurveyId(list[0].surveyId);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load survey responses.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredSurveys = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (surveys || []).filter((s) => {
      if (!q) return true;
      const values = [s.name, s.surveyCode, s.category, s.projectName]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());
      return values.some((v) => v.includes(q));
    });
  }, [surveys, search]);

  const activeSurvey =
    filteredSurveys.find(
      (s) => String(s.surveyId) === String(selectedSurveyId)
    ) || filteredSurveys[0];

  const questionStats = useMemo(
    () => (activeSurvey ? buildQuestionStats(activeSurvey) : []),
    [activeSurvey]
  );

  // ---------- STATES: loading & error ----------
  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-4 text-sm md:text-base" style={{ color: themeColors.text }}>
            Loading survey charts...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-4 md:p-5 rounded-xl border shadow-sm text-sm md:text-base"
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
            <FaChartBar />
            Survey Analytics
          </h1>
          <p
            className="text-sm md:text-base mt-1 opacity-80"
            style={{ color: themeColors.text }}
          >
            Yahan se har survey ke questions ka overall analysis dekho – bar /
            pie chart, counts aur percentage ke saath.
          </p>
        </div>
      </div>

      {/* Layout: left survey list, right charts */}
      <div className="grid gap-4 lg:gap-5 lg:grid-cols-[280px,1fr]">
        {/* Left: survey list panel */}
        <div
          className="rounded-2xl border p-4 space-y-3 shadow-sm max-h-[75vh]"
          style={{
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
          }}
        >
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60 text-sm" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search survey..."
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm"
              style={{
                borderColor: themeColors.border,
                backgroundColor: themeColors.background,
                color: themeColors.text,
              }}
            />
          </div>

          <div className="text-xs md:text-sm font-semibold flex items-center justify-between mt-1">
            <span style={{ color: themeColors.text }}>Surveys</span>
            <span
              style={{ color: themeColors.text }}
              className="opacity-75"
            >
              {filteredSurveys.length} found
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pt-1 pr-1">
            {filteredSurveys.length === 0 && (
              <p
                className="text-xs md:text-sm opacity-75"
                style={{ color: themeColors.text }}
              >
                Koi survey match nahi hua.
              </p>
            )}

            {filteredSurveys.map((s) => {
              const isActive =
                String(s.surveyId) === String(activeSurvey?.surveyId);
              return (
                <button
                  key={s.surveyId}
                  type="button"
                  onClick={() => setSelectedSurveyId(s.surveyId)}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl border text-xs md:text-sm transition-all"
                  style={{
                    borderColor: isActive
                      ? themeColors.primary
                      : themeColors.border,
                    backgroundColor: isActive
                      ? themeColors.primary + "20"
                      : themeColors.background,
                    color: themeColors.text,
                    boxShadow: isActive ? "0 4px 10px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold truncate">
                      {s.name || "Untitled Survey"}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full border"
                      style={{
                        borderColor: themeColors.border,
                        color: themeColors.text,
                        backgroundColor: "rgba(0,0,0,0.03)",
                      }}
                    >
                      {s.totalResponses ?? s.responses?.length ?? 0} resp
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 items-center">
                    <span
                      className="text-[11px] font-mono opacity-75"
                      style={{ color: themeColors.text }}
                    >
                      {s.surveyCode}
                    </span>
                    {s.status && (
                      <span
                        className="text-[11px] px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor:
                            s.status === "ACTIVE"
                              ? themeColors.success + "25"
                              : s.status === "DRAFT"
                              ? themeColors.primary + "20"
                              : themeColors.danger + "20",
                          color:
                            s.status === "ACTIVE"
                              ? themeColors.success
                              : s.status === "DRAFT"
                              ? themeColors.primary
                              : themeColors.danger,
                        }}
                      >
                        {s.status}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: active survey charts */}
        <div className="space-y-4 md:space-y-5">
          {!activeSurvey && (
            <p
              className="text-sm md:text-base opacity-75"
              style={{ color: themeColors.text }}
            >
              No survey selected.
            </p>
          )}

          {activeSurvey && (
            <>
              {/* Active survey header summary */}
              <div
                className="rounded-2xl border p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm"
                style={{
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.border,
                }}
              >
                <div>
                  <p
                    className="text-xs md:text-sm uppercase font-semibold opacity-70"
                    style={{ color: themeColors.text }}
                  >
                    Selected Survey
                  </p>
                  <h2
                    className="text-base md:text-lg font-semibold mt-1 flex items-center gap-2"
                    style={{ color: themeColors.text }}
                  >
                    <FaClipboardList />
                    {activeSurvey.name || "Untitled Survey"}
                  </h2>
                  <p
                    className="text-xs md:text-sm mt-1 opacity-80"
                    style={{ color: themeColors.text }}
                  >
                    Code:{" "}
                    <span className="font-mono">
                      {activeSurvey.surveyCode}
                    </span>
                    {activeSurvey.projectName && ` · ${activeSurvey.projectName}`}
                    {activeSurvey.category && ` · ${activeSurvey.category}`}
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 text-xs md:text-sm">
                  <div>
                    <p
                      className="text-[11px] md:text-xs opacity-70"
                      style={{ color: themeColors.text }}
                    >
                      Total Responses
                    </p>
                    <p
                      className="text-xl md:text-2xl font-bold"
                      style={{ color: themeColors.primary }}
                    >
                      {activeSurvey.responses?.length ??
                        activeSurvey.totalResponses ??
                        0}
                    </p>
                  </div>
                  {activeSurvey.status && (
                    <div>
                      <p
                        className="text-[11px] md:text-xs opacity-70"
                        style={{ color: themeColors.text }}
                      >
                        Status
                      </p>
                      <span
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs md:text-sm font-semibold"
                        style={{
                          backgroundColor:
                            activeSurvey.status === "ACTIVE"
                              ? themeColors.success + "25"
                              : activeSurvey.status === "DRAFT"
                              ? themeColors.primary + "20"
                              : themeColors.danger + "20",
                          color:
                            activeSurvey.status === "ACTIVE"
                              ? themeColors.success
                              : activeSurvey.status === "DRAFT"
                              ? themeColors.primary
                              : themeColors.danger,
                        }}
                      >
                        {activeSurvey.status === "ACTIVE" && <FaPlay />}
                        {activeSurvey.status === "DRAFT" && <FaRegClock />}
                        {activeSurvey.status === "CLOSED" && <FaStopCircle />}
                        {activeSurvey.status}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Question charts */}
              {questionStats.length === 0 && (
                <p
                  className="text-sm md:text-base opacity-75"
                  style={{ color: themeColors.text }}
                >
                  Is survey ke questions ka chart banane ke liye koi structured
                  responses nahi mile (shayad sab open-ended hon).
                </p>
              )}

              {questionStats.map((q) => (
                <QuestionChart
                  key={q.questionId || q.questionText}
                  qStat={q}
                  themeColors={themeColors}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

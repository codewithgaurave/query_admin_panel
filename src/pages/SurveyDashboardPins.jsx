// src/pages/SurveyDashboardPins.jsx
import { useEffect, useMemo, useState } from "react";
import { FaThumbtack, FaClipboardList, FaSearch } from "react-icons/fa";
import { toast } from "sonner";
import { useTheme } from "../context/ThemeContext";
import {
  getDashboardPinnedQuestions,
  deleteDashboardPinnedQuestion, // ⭐ NEW
} from "../apis/surveyPublic";

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

// Chart.js register
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const fmtPercent = (v) => `${v.toFixed(2)} %`;

// Small card component for each pinned question
function PinnedQuestionCard({ pin, themeColors, onDelete, isDeleting }) {
  const {
    surveyName,
    surveyCode,
    questionText,
    total,
    options,
    lastResponseAt,
  } = pin;

  const labels = options.map((o) => o.label || "–");
  const counts = options.map((o) => o.count);

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
            size: 11,
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
        ticks: { color: themeColors.text, font: { size: 11 } },
        grid: { display: false },
      },
      y: {
        ticks: { color: themeColors.text, font: { size: 11 } },
        grid: { color: themeColors.border + "80" },
        beginAtZero: true,
      },
    },
  };

  const lastResp =
    lastResponseAt && !Number.isNaN(Date.parse(lastResponseAt))
      ? new Date(lastResponseAt).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "No responses yet";

  return (
    <div
      className="rounded-2xl border p-4 md:p-5 space-y-4 shadow-sm"
      style={{
        borderColor: themeColors.border,
        backgroundColor: themeColors.surface,
      }}
    >
      {/* Header row */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-1 text-base">
            <FaThumbtack />
          </span>
          <div>
            <p
              className="text-xs uppercase font-semibold opacity-70 flex items-center gap-2"
              style={{ color: themeColors.text }}
            >
              <FaClipboardList />
              {surveyName || "Untitled Survey"}
            </p>
            <p
              className="text-[11px] md:text-xs mt-0.5 opacity-80 font-mono"
              style={{ color: themeColors.text }}
            >
              Code: {surveyCode || "-"}
            </p>
            <p
              className="font-semibold text-sm md:text-base leading-snug mt-2"
              style={{ color: themeColors.text }}
            >
              {questionText}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 text-xs md:text-sm">
          <div className="flex items-center gap-2">
            <div>
              <p
                className="text-[11px] uppercase opacity-70"
                style={{ color: themeColors.text }}
              >
                Total Responses
              </p>
              <p
                className="text-xl md:text-2xl font-bold text-right"
                style={{ color: themeColors.primary }}
              >
                {total}
              </p>
            </div>

            {/* ⭐ Delete / Unpin button */}
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 rounded-full text-[11px] md:text-xs border hover:opacity-90 transition disabled:opacity-60"
                style={{
                  borderColor: themeColors.border,
                  color: themeColors.danger,
                  backgroundColor: themeColors.background,
                }}
              >
                {isDeleting ? "Removing..." : "Unpin"}
              </button>
            )}
          </div>

          <div className="text-right">
            <p
              className="text-[11px] uppercase opacity-70"
              style={{ color: themeColors.text }}
            >
              Last Response
            </p>
            <p
              className="text-[11px] md:text-xs opacity-85"
              style={{ color: themeColors.text }}
            >
              {lastResp}
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="mt-2 w-full overflow-x-auto">
        <div className="min-w-[260px] h-64 md:h-72">
          <Bar data={chartData} options={barOptions} />
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 border rounded-xl overflow-hidden text-xs md:text-sm">
        <table className="w-full">
          <thead
            style={{
              backgroundColor: themeColors.background,
            }}
          >
            <tr>
              <th className="px-3 md:px-4 py-2 md:py-2.5 text-left">
                Option
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

export default function SurveyDashboardPins() {
  const { themeColors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pins, setPins] = useState([]);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState(null); // ⭐ NEW

  const loadPins = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getDashboardPinnedQuestions();
      setPins(res?.pins || []);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load pinned questions.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeletePin = async (pin) => {
    const confirmDelete = window.confirm(
      `Kya aap sure ho ki "${pin.questionText}" ko dashboard se unpin karna hai?`
    );
    if (!confirmDelete) return;

    try {
      setDeletingId(pin.pinId);
      const res = await deleteDashboardPinnedQuestion(pin.pinId);
      toast.success(res?.message || "Pinned question removed from dashboard.");

      // Local state se bhi hata do
      setPins((prev) => prev.filter((p) => p.pinId !== pin.pinId));
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to remove pinned question.";
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredPins = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pins;
    return pins.filter((p) => {
      const fields = [p.surveyName, p.surveyCode, p.questionText].filter(
        Boolean
      );
      return fields.some((f) => String(f).toLowerCase().includes(q));
    });
  }, [pins, search]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto" />
          <p
            className="mt-4 text-sm md:text-base"
            style={{ color: themeColors.text }}
          >
            Loading pinned questions...
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
            <FaThumbtack />
            Pinned Questions Dashboard
          </h1>
          <p
            className="text-sm md:text-base mt-1 opacity-80"
            style={{ color: themeColors.text }}
          >
            Yahan tumne jo survey questions <b>pin</b> kiye hain, unka live
            analytics ek hi jagah pe dikhega – total responses, option-wise
            counts, percentage aur bar chart ke saath.
          </p>
        </div>
      </div>

      {/* Search + stats */}
      <div
        className="rounded-2xl border p-4 md:p-5 flex flex-col gap-4 shadow-sm"
        style={{
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="relative w-full md:max-w-xs">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60 text-sm" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by survey / code / question..."
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm"
              style={{
                borderColor: themeColors.border,
                backgroundColor: themeColors.background,
                color: themeColors.text,
              }}
            />
          </div>

          <div className="flex gap-4 text-xs md:text-sm">
            <div>
              <p
                className="text-[11px] md:text-xs uppercase opacity-70"
                style={{ color: themeColors.text }}
              >
                Total Pinned Questions
              </p>
              <p
                className="text-xl md:text-2xl font-bold"
                style={{ color: themeColors.primary }}
              >
                {pins.length}
              </p>
            </div>
            <div>
              <p
                className="text-[11px] md:text-xs uppercase opacity-70"
                style={{ color: themeColors.text }}
              >
                Visible after filter
              </p>
              <p
                className="text-xl md:text-2xl font-bold"
                style={{ color: themeColors.text }}
              >
                {filteredPins.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pinned question cards */}
      {filteredPins.length === 0 ? (
        <p
          className="text-sm md:text-base opacity-75"
          style={{ color: themeColors.text }}
        >
          Abhi koi pinned question nahi mila (ya search filter se hide ho gaya).
          Survey charts page se kisi question ko <b>Pin to Dashboard</b> karo
          aur yahan uska graph dikhega.
        </p>
      ) : (
        <div className="space-y-4 md:space-y-5">
          {filteredPins.map((pin) => (
            <PinnedQuestionCard
              key={pin.pinId}
              pin={pin}
              themeColors={themeColors}
              onDelete={() => handleDeletePin(pin)}
              isDeleting={deletingId === pin.pinId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

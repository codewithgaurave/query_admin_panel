// src/pages/SurveyResponses.jsx
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  FaClipboardList,
  FaSearch,
  FaPlay,
  FaRegClock,
  FaStopCircle,
  FaTimes,
  FaUser,
  FaHeadphones,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaFileExcel,
} from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import {
  listSurveyResponseSummary,
  getUserSurveySummary,
} from "../apis/surveys";
import * as XLSX from "xlsx"; // Excel export

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

// CSV-safe value
const csvEscape = (val) =>
  `"${String(val ?? "")
    .replace(/"/g, '""')
    .trim()}"`;

// Answer text like UI
const buildAnswerText = (ans) => {
  if (!ans) return "-";
  if (ans.questionType === "OPEN_ENDED") {
    return ans.answerText || "-";
  }
  if (ans.questionType === "RATING") {
    return typeof ans.rating === "number" ? String(ans.rating) : "-";
  }
  const opts = ans.selectedOptions || [];
  return opts.length > 0 ? opts.join(", ") : "-";
};

export default function SurveyResponses() {
  const { themeColors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userSurveyData, setUserSurveyData] = useState(null);
  const [responseFilter, setResponseFilter] = useState("ALL");

  const [openAudioId, setOpenAudioId] = useState(null);

  // common exporting state (CSV / Excel)
  const [exportingSurveyId, setExportingSurveyId] = useState(null);

  const loadSummary = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await listSurveyResponseSummary();
      setSummary(res.surveys || []);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load survey responses summary.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const filteredSummary = useMemo(() => {
    const q = search.trim().toLowerCase();

    return (summary || []).filter((s) => {
      const statusOk =
        statusFilter === "All"
          ? true
          : String(s.status) === String(statusFilter);

      const searchOk =
        !q ||
        [s.name, s.surveyCode, s.category, s.projectName]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));

      return statusOk && searchOk;
    });
  }, [summary, search, statusFilter]);

  const openUserDetail = async (survey, user) => {
    setSelectedSurvey(survey);
    setSelectedUser(user);
    setUserSurveyData(null);
    setResponseFilter("ALL");
    setOpenAudioId(null);

    try {
      setUserLoading(true);
      const res = await getUserSurveySummary(user.userCode);
      setUserSurveyData(res || null);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load user survey responses.";
      toast.error(msg);
    } finally {
      setUserLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedSurvey(null);
    setSelectedUser(null);
    setUserSurveyData(null);
    setUserLoading(false);
    setResponseFilter("ALL");
    setOpenAudioId(null);
  };

  // -------- Helper: collect all records + question order (common for CSV & Excel) --------
  const collectSurveyRecords = async (surveySummaryItem) => {
    const users = surveySummaryItem.users || [];
    const allRecords = []; // { user, resp, answersMap }
    const questionOrder = [];
    const questionSet = new Set();

    for (const user of users) {
      try {
        const res = await getUserSurveySummary(user.userCode);
        const data = res || {};

        const surveyItem =
          data.surveys?.find(
            (sv) =>
              String(sv.surveyId) === String(surveySummaryItem.surveyId) ||
              sv.surveyCode === surveySummaryItem.surveyCode
          ) || null;

        if (!surveyItem || !surveyItem.responses?.length) {
          continue;
        }

        (surveyItem.responses || []).forEach((resp) => {
          const answers = resp.answers || [];
          const answersMap = {};

          answers.forEach((a) => {
            const qText = a.questionText || "";
            if (!qText) return;
            const ansText = buildAnswerText(a);

            if (!questionSet.has(qText)) {
              questionSet.add(qText);
              questionOrder.push(qText);
            }

            answersMap[qText] = ansText;
          });

          allRecords.push({ user, resp, answersMap });
        });
      } catch (err) {
        console.error("Error fetching user survey summary for export", err);
      }
    }

    return { allRecords, questionOrder };
  };

  // ---------------- CSV EXPORT ----------------
  const handleExportSurveyCSV = async (surveySummaryItem) => {
    if (!surveySummaryItem) return;

    const users = surveySummaryItem.users || [];
    if (users.length === 0) {
      toast.error("Is survey ke liye koi user data nahi mila.");
      return;
    }

    try {
      setExportingSurveyId(surveySummaryItem.surveyId);
      toast.info("CSV export prepare ho raha hai...");

      const { allRecords, questionOrder } =
        await collectSurveyRecords(surveySummaryItem);

      if (allRecords.length === 0) {
        toast.error(
          "Is survey ke liye export karne layak koi response nahi mila."
        );
        setExportingSurveyId(null);
        return;
      }

      const rows = [];

      // Meta sheet jaisa top section CSV me bhi
      rows.push(["Survey Responses Export"]);
      rows.push(["Survey ID", surveySummaryItem.surveyId]);
      rows.push(["Survey Code", surveySummaryItem.surveyCode || "-"]);
      rows.push(["Survey Name", surveySummaryItem.name || "-"]);
      rows.push([]);

      const questionHeaders = questionOrder;

      // Header row
      rows.push([
        "Sample ID",
        "Timestamp",
        "Last Updated (IST)",
        "Latitude",
        "Longitude",
        "Address",
        "Audio Url",
        "Surveyor Name",
        "Surveyor Phone Number",
        "Is Approved",
        "Approved By Name",
        "Approved By User Code",
        "Is Completed",
        ...questionHeaders,
      ]);

      // Data rows
      allRecords.forEach(({ user, resp, answersMap }) => {
        const lat =
          resp.latitude !== undefined && resp.latitude !== null
            ? Number(resp.latitude)
            : "";
        const lng =
          resp.longitude !== undefined && resp.longitude !== null
            ? Number(resp.longitude)
            : "";

        const row = [
          resp.responseId ?? "",
          resp.createdAt ?? "",
          resp.updatedAtIST ?? "",
          lat !== "" && !Number.isNaN(lat) ? lat : "",
          lng !== "" && !Number.isNaN(lng) ? lng : "",
          resp.address ?? "",
          resp.audioUrl ?? "",
          user.userName || user.userCode || "",
          user.userMobile || "",
          resp.isApproved ? "YES" : "NO",
          resp.approvedByName || "",
          resp.approvedByUserCode || "",
          resp.isCompleted === false ? "NO" : "YES",
          ...questionHeaders.map((qh) => answersMap[qh] ?? ""),
        ];

        rows.push(row);
      });

      const csvContent = rows
        .map((row) => row.map(csvEscape).join(","))
        .join("\r\n");

      const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName =
        (surveySummaryItem.name || "survey")
          .replace(/[^\w\-]+/g, "_")
          .substring(0, 80) + "_responses_export.csv";
      link.href = url;
      link.setAttribute("download", safeName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Survey responses CSV export ho gaya.");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to export survey data (CSV).";
      toast.error(msg);
    } finally {
      setExportingSurveyId(null);
    }
  };

  // ---------------- EXCEL EXPORT ----------------
  const handleExportSurveyExcel = async (surveySummaryItem) => {
    if (!surveySummaryItem) return;

    const users = surveySummaryItem.users || [];
    if (users.length === 0) {
      toast.error("Is survey ke liye koi user data nahi mila.");
      return;
    }

    try {
      setExportingSurveyId(surveySummaryItem.surveyId);
      toast.info("Excel export prepare ho raha hai...");

      const { allRecords, questionOrder } =
        await collectSurveyRecords(surveySummaryItem);

      if (allRecords.length === 0) {
        toast.error(
          "Is survey ke liye export karne layak koi response nahi mila."
        );
        setExportingSurveyId(null);
        return;
      }

      const dataRows = allRecords.map(({ user, resp, answersMap }) => {
        const lat =
          resp.latitude !== undefined && resp.latitude !== null
            ? Number(resp.latitude)
            : "";
        const lng =
          resp.longitude !== undefined && resp.longitude !== null
            ? Number(resp.longitude)
            : "";

        const baseRow = {
          "Sample ID": resp.responseId ?? "",
          Timestamp: resp.createdAt ?? "",
          "Last Updated (IST)": resp.updatedAtIST ?? "",
          Latitude:
            lat !== "" && !Number.isNaN(lat) ? lat : "",
          Longitude:
            lng !== "" && !Number.isNaN(lng) ? lng : "",
          Address: resp.address ?? "",
          "Audio Url": resp.audioUrl ?? "",
          "Surveyor Name": user.userName || user.userCode || "",
          "Surveyor Phone Number": user.userMobile || "",
          "Is Approved": resp.isApproved ? "YES" : "NO",
          "Approved By Name": resp.approvedByName || "",
          "Approved By User Code": resp.approvedByUserCode || "",
          "Is Completed": resp.isCompleted === false ? "NO" : "YES",
        };

        questionOrder.forEach((qText) => {
          baseRow[qText] = answersMap[qText] ?? "";
        });

        return baseRow;
      });

      const wb = XLSX.utils.book_new();

      // Meta sheet
      const metaSheetData = [
        ["Survey Responses Export"],
        ["Survey ID", surveySummaryItem.surveyId],
        ["Survey Code", surveySummaryItem.surveyCode || "-"],
        ["Survey Name", surveySummaryItem.name || "-"],
      ];
      const metaWs = XLSX.utils.aoa_to_sheet(metaSheetData);
      XLSX.utils.book_append_sheet(wb, metaWs, "Meta");

      // Responses sheet
      const dataWs = XLSX.utils.json_to_sheet(dataRows);
      XLSX.utils.book_append_sheet(wb, dataWs, "Responses");

      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });

      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName =
        (surveySummaryItem.name || "survey")
          .replace(/[^\w\-]+/g, "_")
          .substring(0, 80) + "_responses_export.xlsx";

      link.href = url;
      link.setAttribute("download", safeName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Survey responses Excel export ho gaya.");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to export survey data (Excel).";
      toast.error(msg);
    } finally {
      setExportingSurveyId(null);
    }
  };

  // ---- Loading & error for main ----
  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-4" style={{ color: themeColors.text }}>
            Loading survey responses...
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

  // ---------- DETAIL VIEW (full screen) ----------
  if (selectedSurvey && selectedUser) {
    const surveyItem =
      userSurveyData?.surveys?.find(
        (sv) =>
          String(sv.surveyId) === String(selectedSurvey?.surveyId) ||
          sv.surveyCode === selectedSurvey?.surveyCode
      ) || null;

    let content;

    if (userLoading) {
      content = (
        <div className="flex items-center justify-center py-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto" />
            <p className="mt-3 text-sm" style={{ color: themeColors.text }}>
              Loading user responses...
            </p>
          </div>
        </div>
      );
    } else if (!userSurveyData) {
      content = (
        <p className="text-sm opacity-75" style={{ color: themeColors.text }}>
          No data found.
        </p>
      );
    } else if (!surveyItem || !surveyItem.responses?.length) {
      content = (
        <p className="text-sm opacity-75" style={{ color: themeColors.text }}>
          Is user ne is survey ka koi response nahi diya (ya data migrate nahi
          hua).
        </p>
      );
    } else {
      const responses = surveyItem.responses || [];
      const totalResponses = responses.length;
      const approvedCount = responses.filter((r) => r.isApproved).length;
      const notApprovedCount = totalResponses - approvedCount;

      const filteredResponses = responses.filter((r) => {
        if (responseFilter === "APPROVED") return r.isApproved;
        if (responseFilter === "NOT_APPROVED") return !r.isApproved;
        return true;
      });

      content = (
        <>
          {/* Stats + filters */}
          <div className="space-y-4">
            <div
              className="rounded-2xl border p-4 grid grid-cols-1 sm:grid-cols-3 gap-3"
              style={{
                borderColor: themeColors.border,
                backgroundColor: themeColors.surface,
              }}
            >
              <div>
                <p
                  className="text-[11px] opacity-70"
                  style={{ color: themeColors.text }}
                >
                  Total Responses
                </p>
                <p
                  className="text-xl font-bold mt-1"
                  style={{ color: themeColors.primary }}
                >
                  {totalResponses}
                </p>
              </div>
              <div>
                <p
                  className="text-[11px] opacity-70"
                  style={{ color: themeColors.text }}
                >
                  Approved
                </p>
                <p
                  className="text-xl font-bold mt-1 flex items-center gap-1"
                  style={{ color: themeColors.success }}
                >
                  <FaCheckCircle />
                  {approvedCount}
                </p>
              </div>
              <div>
                <p
                  className="text-[11px] opacity-70"
                  style={{ color: themeColors.text }}
                >
                  Not Approved
                </p>
                <p
                  className="text-xl font-bold mt-1"
                  style={{ color: themeColors.danger }}
                >
                  {notApprovedCount}
                </p>
              </div>
            </div>

            {/* Filter bar */}
            <div
              className="rounded-2xl border p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              style={{
                borderColor: themeColors.border,
                backgroundColor: themeColors.surface,
              }}
            >
              <div>
                <p
                  className="text-xs font-semibold"
                  style={{ color: themeColors.text }}
                >
                  Responses for this user
                </p>
                <p
                  className="text-[11px] opacity-70 mt-0.5"
                  style={{ color: themeColors.text }}
                >
                  Filter karo approval ke hisaab se.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-[11px] opacity-70"
                  style={{ color: themeColors.text }}
                >
                  Show:
                </span>
                <select
                  className="px-2 py-1.5 rounded-lg border text-[11px]"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.background,
                    color: themeColors.text,
                  }}
                  value={responseFilter}
                  onChange={(e) => setResponseFilter(e.target.value)}
                >
                  <option value="ALL">All Responses</option>
                  <option value="APPROVED">Only Approved</option>
                  <option value="NOT_APPROVED">Only Not Approved</option>
                </select>
              </div>
            </div>
          </div>

          {/* Response list */}
          <div className="mt-4 space-y-4">
            {filteredResponses.length === 0 && (
              <p
                className="text-sm opacity-75"
                style={{ color: themeColors.text }}
              >
                No responses matching current filter.
              </p>
            )}

            {filteredResponses.map((resp, idx) => {
              const respKey = resp.responseId ?? `resp-${idx}`;
              const isAudioOpen = openAudioId === respKey;

              const hasLocation =
                resp.latitude !== undefined &&
                resp.latitude !== null &&
                resp.longitude !== undefined &&
                resp.longitude !== null;

              const approvedLabel = resp.approvedByName
                ? `${resp.approvedByName}${
                    resp.approvedByUserCode
                      ? ` (${resp.approvedByUserCode})`
                      : ""
                  }`
                : resp.approvedByUserCode ||
                  (resp.approvedBy ? String(resp.approvedBy) : "-");

              return (
                <div
                  key={respKey}
                  className="rounded-2xl border p-3 sm:p-4 space-y-3"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.surface,
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p
                        className="text-xs font-semibold"
                        style={{ color: themeColors.text }}
                      >
                        Response #{responses.length - idx}
                      </p>
                      <p
                        className="text-[11px] opacity-70"
                        style={{ color: themeColors.text }}
                      >
                        {fmtDateTime(resp.createdAt)}
                      </p>
                      {resp.isCompleted === false && (
                        <p
                          className="text-[11px] opacity-70"
                          style={{ color: themeColors.danger }}
                        >
                          (Incomplete response)
                        </p>
                      )}

                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {resp.isApproved ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                            style={{
                              backgroundColor: themeColors.success + "20",
                              color: themeColors.success,
                            }}
                          >
                            <FaCheckCircle />
                            Approved
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                            style={{
                              backgroundColor: themeColors.danger + "20",
                              color: themeColors.danger,
                            }}
                          >
                            Not Approved
                          </span>
                        )}
                        <span
                          className="text-[11px] opacity-70"
                          style={{ color: themeColors.text }}
                        >
                          Approved By:{" "}
                          <span className="font-mono">
                            {approvedLabel || "-"}
                          </span>
                        </span>
                      </div>

                      {hasLocation && (
                        <button
                          type="button"
                          onClick={() => {
                            const url = `https://www.google.com/maps?q=${resp.latitude},${resp.longitude}`;
                            window.open(url, "_blank", "noopener,noreferrer");
                          }}
                          className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px]"
                          style={{
                            borderColor: themeColors.primary,
                            color: themeColors.primary,
                            backgroundColor: themeColors.background,
                          }}
                        >
                          <FaMapMarkerAlt />
                          View Location
                          <span className="opacity-70">
                            ({Number(resp.latitude).toFixed(4)},{" "}
                            {Number(resp.longitude).toFixed(4)})
                          </span>
                        </button>
                      )}
                    </div>

                    {resp.audioUrl && (
                      <div className="flex flex-col items-start sm:items-end gap-2 min-w-[220px]">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenAudioId((prev) =>
                              prev === respKey ? null : respKey
                            )
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[11px] font-semibold"
                          style={{
                            borderColor: themeColors.primary,
                            color: themeColors.primary,
                            backgroundColor: themeColors.background,
                          }}
                        >
                          <FaHeadphones />
                          {isAudioOpen ? "Hide Audio" : "Listen Audio"}
                        </button>

                        {isAudioOpen && (
                          <audio
                            controls
                            autoPlay
                            className="w-full"
                            src={resp.audioUrl}
                          >
                            Your browser does not support the audio element.
                          </audio>
                        )}
                      </div>
                    )}
                  </div>

                  <hr
                    className="border-t my-1"
                    style={{ borderColor: themeColors.border }}
                  />

                  <div className="mt-1 space-y-3">
                    {(resp.answers || []).map((a, qIndex) => {
                      const answerText = buildAnswerText(a);

                      return (
                        <div
                          key={a.questionId || qIndex}
                          className="rounded-lg border p-2.5 sm:p-3"
                          style={{
                            borderColor: themeColors.border,
                            backgroundColor: themeColors.background,
                          }}
                        >
                          <div className="flex flex-col gap-1">
                            <p
                              className="text-xs font-semibold"
                              style={{ color: themeColors.text }}
                            >
                              Q{qIndex + 1}. {a.questionText}
                            </p>
                            <p
                              className="text-[11px] opacity-70"
                              style={{ color: themeColors.text }}
                            >
                              Type: {a.questionType}
                            </p>
                            <p
                              className="text-xs mt-1"
                              style={{ color: themeColors.text }}
                            >
                              <span className="font-semibold">Answer: </span>
                              {answerText}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={closeDetail}
            className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border w-max"
            style={{
              borderColor: themeColors.border,
              color: themeColors.text,
              backgroundColor: themeColors.surface,
            }}
          >
            <FaTimes className="text-[10px]" />
            Back to Survey List
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h1
                className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2"
                style={{ color: themeColors.text }}
              >
                <FaClipboardList />
                User Survey Responses
              </h1>
              <p
                className="text-sm mt-1 opacity-75"
                style={{ color: themeColors.text }}
              >
                {selectedUser?.userName || selectedUser?.userCode} ke saare
                responses is survey ke liye.
              </p>

              <div className="mt-2 text-[11px] space-y-0.5">
                <p style={{ color: themeColors.text }}>
                  <span className="font-semibold">User Code:</span>{" "}
                  {selectedUser?.userCode}
                  {selectedUser?.userMobile
                    ? ` · ${selectedUser.userMobile}`
                    : ""}
                </p>
                <p style={{ color: themeColors.text }}>
                  <span className="font-semibold">Survey:</span>{" "}
                  {selectedSurvey?.name}{" "}
                  <span className="font-mono">
                    ({selectedSurvey?.surveyCode})
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {content}
      </div>
    );
  }

  // ---------- LIST VIEW ----------
  return (
    <div className="relative space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1
            className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2"
            style={{ color: themeColors.text }}
          >
            <FaClipboardList />
            Survey Responses
          </h1>
          <p
            className="text-sm mt-1 opacity-75"
            style={{ color: themeColors.text }}
          >
            Dekho kaun-kaun se surveys pe kitne responses aaye, kis user ne diya,
            aur detail dekhne ke liye user pe click karo. Ab har survey ka full
            Excel aur CSV export dono available hai.
          </p>
        </div>
      </div>

      <div
        className="rounded-xl border p-3 md:p-4 shadow-sm"
        style={{
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
        }}
      >
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by survey name, code, project, category"
              className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm"
              style={{
                borderColor: themeColors.border,
                backgroundColor: themeColors.background,
                color: themeColors.text,
              }}
            />
          </div>

          <div className="min-w-[160px]">
            <label
              className="text-xs mb-1 block opacity-70"
              style={{ color: themeColors.text }}
            >
              Status
            </label>
            <select
              className="w-full p-2 rounded-lg border text-sm"
              style={{
                borderColor: themeColors.border,
                backgroundColor: themeColors.background,
                color: themeColors.text,
              }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All</option>
              <option value="DRAFT">DRAFT</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>
        </div>
      </div>

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
                  "Survey",
                  "Code",
                  "Status",
                  "Category",
                  "Project",
                  "Total Responses",
                  "Users",
                  "Last Response",
                  "Export",
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
              {filteredSummary.map((s) => (
                <tr key={s.surveyId}>
                  <td className="px-4 py-3">
                    <div
                      className="font-medium"
                      style={{ color: themeColors.text }}
                    >
                      {s.name}
                    </div>
                  </td>

                  <td
                    className="px-4 py-3 text-xs font-mono"
                    style={{ color: themeColors.text }}
                  >
                    {s.surveyCode}
                  </td>

                  <td className="px-4 py-3 text-xs">
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                      style={{
                        backgroundColor:
                          s.status === "ACTIVE"
                            ? themeColors.success + "20"
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
                      {s.status === "ACTIVE" && <FaPlay />}
                      {s.status === "DRAFT" && <FaRegClock />}
                      {s.status === "CLOSED" && <FaStopCircle />}
                      {s.status}
                    </span>
                  </td>

                  <td
                    className="px-4 py-3 text-xs"
                    style={{ color: themeColors.text }}
                  >
                    {s.category || "-"}
                  </td>

                  <td
                    className="px-4 py-3 text-xs"
                    style={{ color: themeColors.text }}
                  >
                    {s.projectName || "-"}
                  </td>

                  <td
                    className="px-4 py-3 text-xs font-semibold"
                    style={{ color: themeColors.primary }}
                  >
                    {s.totalResponses}
                  </td>

                  <td className="px-4 py-3 text-xs">
                    {(!s.users || s.users.length === 0) && (
                      <span
                        className="opacity-60"
                        style={{ color: themeColors.text }}
                      >
                        -
                      </span>
                    )}
                    {s.users && s.users.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {s.users.map((u) => (
                          <button
                            key={u.userCode}
                            type="button"
                            onClick={() => openUserDetail(s, u)}
                            className="px-2.5 py-1 rounded-full border text-[11px] inline-flex items-center gap-1"
                            style={{
                              borderColor: themeColors.border,
                              backgroundColor: themeColors.background,
                              color: themeColors.text,
                            }}
                            title="View detailed answers"
                          >
                            <FaUser />
                            <span className="max-w-[120px] truncate">
                              {u.userName || u.userCode}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </td>

                  <td
                    className="px-4 py-3 text-xs"
                    style={{ color: themeColors.text }}
                  >
                    {fmtDateTime(s.lastResponseAt)}
                  </td>

                  {/* Export buttons */}
                  <td className="px-4 py-3 text-xs">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleExportSurveyCSV(s)}
                        disabled={exportingSurveyId === s.surveyId}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[11px] font-semibold disabled:opacity-60"
                        style={{
                          borderColor: themeColors.primary,
                          backgroundColor: themeColors.surface,
                          color: themeColors.primary,
                        }}
                      >
                        <FaFileExcel />
                        {exportingSurveyId === s.surveyId
                          ? "Exporting..."
                          : "CSV"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportSurveyExcel(s)}
                        disabled={exportingSurveyId === s.surveyId}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[11px] font-semibold disabled:opacity-60"
                        style={{
                          borderColor: themeColors.primary,
                          backgroundColor: themeColors.surface,
                          color: themeColors.primary,
                        }}
                      >
                        <FaFileExcel />
                        {exportingSurveyId === s.surveyId
                          ? "Exporting..."
                          : "Excel"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredSummary.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-sm"
                    style={{ color: themeColors.text }}
                  >
                    No data found for current filters.
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

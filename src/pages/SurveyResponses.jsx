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
  FaCopy,
  FaShareAlt,
  FaExternalLinkAlt,
  FaUserShield,
  FaUserCheck,
  FaCalendarAlt,
  FaDownload,
} from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import {
  listSurveyResponseSummary,
  getUserSurveySummary,
  getSurveyWithQuestions,
  getSurveyResponses,
} from "../apis/surveys";
import { listSubAdmins } from "../apis/subAdmins";
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

const formatDateStr = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isWithinDateRange = (dateInput, startStr, endStr) => {
  if (!startStr && !endStr) return true;
  if (!dateInput) return false;
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return true;
    const dStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
    if (startStr && dStr < startStr) return false;
    if (endStr && dStr > endStr) return false;
    return true;
  } catch {
    return true;
  }
};

const getDateFilterSuffix = (startStr, endStr) => {
  if (startStr && endStr) {
    if (startStr === endStr) return `_${startStr}`;
    return `_${startStr}_to_${endStr}`;
  }
  if (startStr) return `_from_${startStr}`;
  if (endStr) return `_upto_${endStr}`;
  return "";
};

const getDateFilterLabel = (startStr, endStr) => {
  if (startStr && endStr) {
    if (startStr === endStr) return startStr;
    return `${startStr} to ${endStr}`;
  }
  if (startStr) return `From ${startStr}`;
  if (endStr) return `Up to ${endStr}`;
  return "All Time";
};

const handleCopyAudioLink = (audioUrl) => {
  if (!audioUrl) {
    toast.error("Audio URL not available");
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(audioUrl)
      .then(() => {
        toast.success("Audio link copied to clipboard!");
      })
      .catch(() => {
        fallbackCopyText(audioUrl);
      });
  } else {
    fallbackCopyText(audioUrl);
  }
};

const fallbackCopyText = (text) => {
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    if (successful) {
      toast.success("Audio link copied to clipboard!");
    } else {
      toast.error("Failed to copy link");
    }
  } catch (err) {
    toast.error("Could not copy link");
  }
};

const handleShareAudioLink = async (audioUrl, title = "Audio Recording") => {
  if (!audioUrl) {
    toast.error("Audio URL not available");
    return;
  }
  if (navigator.share) {
    try {
      await navigator.share({
        title: title,
        text: `Audio Recording Link: ${audioUrl}`,
        url: audioUrl,
      });
    } catch (err) {
      if (err.name !== "AbortError") {
        handleCopyAudioLink(audioUrl);
      }
    }
  } else {
    handleCopyAudioLink(audioUrl);
  }
};

// CSV-safe value
const csvEscape = (val) =>
  `"${String(val ?? "")
    .replace(/"/g, '""')
    .trim()}"`;

// Answer text like UI - comprehensive support for all answer types
const buildAnswerText = (ans) => {
  if (ans === undefined || ans === null) return "";
  if (typeof ans === "string" || typeof ans === "number" || typeof ans === "boolean") {
    return String(ans).trim();
  }

  const collected = [];

  // Options / selection array
  let opts = [];
  if (Array.isArray(ans.selectedOptions) && ans.selectedOptions.length > 0) {
    opts = ans.selectedOptions
      .map((o) => {
        if (o === null || o === undefined) return "";
        if (typeof o === "object") return o.label || o.value || o.name || JSON.stringify(o);
        return String(o).trim();
      })
      .filter(Boolean);
  } else if (ans.selectedOptions && typeof ans.selectedOptions === "string" && ans.selectedOptions.trim()) {
    opts = [ans.selectedOptions.trim()];
  }

  // Single selectedOption
  if (ans.selectedOption !== undefined && ans.selectedOption !== null) {
    const sel = String(ans.selectedOption).trim();
    if (sel && !opts.includes(sel)) {
      opts.unshift(sel);
    }
  }

  if (opts.length > 0) {
    collected.push(opts.join(", "));
  }

  // Answer text
  const rawText = ans.answerText ?? ans.response ?? ans.value ?? ans.text;
  if (rawText !== undefined && rawText !== null) {
    const strText = String(rawText).trim();
    if (strText && !collected.includes(strText)) {
      collected.push(strText);
    }
  }

  // Rating
  const rawRating = ans.rating;
  if (rawRating !== undefined && rawRating !== null && String(rawRating).trim() !== "") {
    const rNum = Number(rawRating);
    if (!Number.isNaN(rNum)) {
      const ratingStr = `Rating: ${rNum}`;
      if (!collected.some((c) => c.includes(String(rNum)))) {
        collected.push(ratingStr);
      }
    }
  }

  // Other text
  if (ans.otherText && String(ans.otherText).trim()) {
    const oText = String(ans.otherText).trim();
    if (!collected.includes(oText)) {
      collected.push(`(Other: ${oText})`);
    }
  }

  return collected.length > 0 ? collected.join(" | ") : "";
};

export default function SurveyResponses() {
  const { themeColors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [subAdminFilter, setSubAdminFilter] = useState("All");
  const [subAdmins, setSubAdmins] = useState([]);

  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userSurveyData, setUserSurveyData] = useState(null);
  const [responseFilter, setResponseFilter] = useState("ALL");

  const [openAudioId, setOpenAudioId] = useState(null);

  // common exporting state (CSV / Excel)
  const [exportingSurveyId, setExportingSurveyId] = useState(null);

  // Date filter state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [datePreset, setDatePreset] = useState("ALL");

  // Date-wise Export Modal state
  const [exportModalSurvey, setExportModalSurvey] = useState(null);
  const [modalStartDate, setModalStartDate] = useState("");
  const [modalEndDate, setModalEndDate] = useState("");
  const [modalDatePreset, setModalDatePreset] = useState("ALL");

  const loadSummary = async (dateParams) => {
    try {
      setLoading(true);
      setError("");
      const params = {};
      const activeStart = dateParams ? dateParams.startDate : startDate;
      const activeEnd = dateParams ? dateParams.endDate : endDate;
      if (activeStart) params.startDate = activeStart;
      if (activeEnd) params.endDate = activeEnd;
      const res = await listSurveyResponseSummary(params);
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

  const loadSubAdmins = async () => {
    try {
      const res = await listSubAdmins();
      setSubAdmins(res.subAdmins || []);
    } catch (err) {
      console.error("Failed to load sub-admins:", err);
    }
  };

  useEffect(() => {
    loadSubAdmins();
  }, []);

  useEffect(() => {
    loadSummary({ startDate, endDate });
  }, [startDate, endDate]);

  const handleApplyPreset = (preset) => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === "ALL") {
      setStartDate("");
      setEndDate("");
    } else if (preset === "TODAY") {
      const todayStr = formatDateStr(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "YESTERDAY") {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = formatDateStr(yest);
      setStartDate(yestStr);
      setEndDate(yestStr);
    } else if (preset === "LAST_7") {
      const endStr = formatDateStr(now);
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      const startStr = formatDateStr(start);
      setStartDate(startStr);
      setEndDate(endStr);
    } else if (preset === "LAST_30") {
      const endStr = formatDateStr(now);
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      const startStr = formatDateStr(start);
      setStartDate(startStr);
      setEndDate(endStr);
    } else if (preset === "THIS_MONTH") {
      const endStr = formatDateStr(now);
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const startStr = formatDateStr(start);
      setStartDate(startStr);
      setEndDate(endStr);
    }
  };

  const handleCustomDateChange = (startVal, endVal) => {
    setDatePreset("CUSTOM");
    setStartDate(startVal);
    setEndDate(endVal);
  };

  const handleClearDateFilter = () => {
    setDatePreset("ALL");
    setStartDate("");
    setEndDate("");
  };

  const openExportModal = (survey) => {
    setExportModalSurvey(survey);
    setModalStartDate(startDate);
    setModalEndDate(endDate);
    setModalDatePreset(datePreset);
  };

  const closeExportModal = () => {
    setExportModalSurvey(null);
  };

  const handleApplyModalPreset = (preset) => {
    setModalDatePreset(preset);
    const now = new Date();

    if (preset === "ALL") {
      setModalStartDate("");
      setModalEndDate("");
    } else if (preset === "TODAY") {
      const todayStr = formatDateStr(now);
      setModalStartDate(todayStr);
      setModalEndDate(todayStr);
    } else if (preset === "YESTERDAY") {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = formatDateStr(yest);
      setModalStartDate(yestStr);
      setModalEndDate(yestStr);
    } else if (preset === "LAST_7") {
      const endStr = formatDateStr(now);
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      const startStr = formatDateStr(start);
      setModalStartDate(startStr);
      setModalEndDate(endStr);
    } else if (preset === "LAST_30") {
      const endStr = formatDateStr(now);
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      const startStr = formatDateStr(start);
      setModalStartDate(startStr);
      setModalEndDate(endStr);
    } else if (preset === "THIS_MONTH") {
      const endStr = formatDateStr(now);
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const startStr = formatDateStr(start);
      setModalStartDate(startStr);
      setModalEndDate(endStr);
    }
  };

  const filteredSummary = useMemo(() => {
    const q = search.trim().toLowerCase();

    return (summary || []).filter((s) => {
      const statusOk =
        statusFilter === "All"
          ? true
          : String(s.status) === String(statusFilter);

      const subAdminOk =
        subAdminFilter === "All"
          ? true
          : String(s.createdByAdmin?._id || s.createdByAdmin) === String(subAdminFilter);

      const searchOk =
        !q ||
        [
          s.name,
          s.surveyCode,
          s.category,
          s.projectName,
          s.createdByAdmin?.name,
          s.createdByAdmin?.adminId,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));

      return statusOk && subAdminOk && searchOk;
    });
  }, [summary, search, statusFilter, subAdminFilter]);

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
  const collectSurveyRecords = async (surveySummaryItem, dateFilterOverride = null) => {
    const activeFilter = dateFilterOverride || { startDate, endDate };
    const surveyIdOrCode =
      surveySummaryItem.surveyId || surveySummaryItem.surveyCode;
    let rawResponses = [];
    let officialQuestions = [];

    // 1. Fetch survey official questions to guarantee exact question order & all questions included
    try {
      const qRes = await getSurveyWithQuestions(surveyIdOrCode);
      if (qRes?.questions && Array.isArray(qRes.questions)) {
        officialQuestions = qRes.questions;
      }
    } catch (err) {
      console.warn("Could not fetch survey questions directly:", err);
    }

    // 2. Fetch all survey responses in one direct query with dateFilter
    try {
      const respRes = await getSurveyResponses(surveyIdOrCode, activeFilter);
      if (respRes?.responses && Array.isArray(respRes.responses)) {
        rawResponses = respRes.responses;
      }
    } catch (err) {
      console.warn(
        "Could not fetch survey responses directly, falling back:",
        err
      );
    }

    // Fallback: If direct responses call returned empty, try collecting via users list
    if (!rawResponses.length && surveySummaryItem.users?.length) {
      for (const user of surveySummaryItem.users) {
        if (!user.userCode) continue;
        try {
          const res = await getUserSurveySummary(user.userCode);
          const data = res || {};
          const surveyItem =
            data.surveys?.find(
              (sv) =>
                String(sv.surveyId) === String(surveySummaryItem.surveyId) ||
                sv.surveyCode === surveySummaryItem.surveyCode
            ) || null;

          if (surveyItem?.responses?.length) {
            surveyItem.responses.forEach((r) => {
              rawResponses.push({
                ...r,
                userCode: user.userCode,
                userName: user.userName,
                userMobile: user.userMobile,
              });
            });
          }
        } catch (err) {
          console.error("Fallback user summary fetch error", err);
        }
      }
    }

    // Client-side date filter safeguard
    if (activeFilter.startDate || activeFilter.endDate) {
      rawResponses = rawResponses.filter((r) =>
        isWithinDateRange(r.createdAt, activeFilter.startDate, activeFilter.endDate)
      );
    }

    // 3. Build Question Columns List with Unique Identifiers and Clear Labels
    const questionColumns = []; // Array of { key: string, label: string, qId: string, qText: string }
    const qIdToColKey = new Map();
    const rawTextToColKey = new Map();

    const usedLabels = new Set();
    const makeUniqueLabel = (baseLabel) => {
      let candidate = baseLabel;
      let counter = 1;
      while (usedLabels.has(candidate)) {
        counter++;
        candidate = `${baseLabel} (${counter})`;
      }
      usedLabels.add(candidate);
      return candidate;
    };

    // Add all official questions (guarantees all 74 questions get individual distinct columns!)
    officialQuestions.forEach((q, idx) => {
      const qText = (q.questionText || "").trim() || `Question ${idx + 1}`;
      const qId = String(q.id || q._id || "").trim();
      const colKey = qId ? `qid_${qId}` : `qidx_${idx}`;

      let baseLabel = qText;
      if (q.parentOptionValue && String(q.parentOptionValue).trim()) {
        baseLabel = `${qText} (${String(q.parentOptionValue).trim()})`;
      }

      const label = makeUniqueLabel(baseLabel);

      questionColumns.push({ key: colKey, label, qId, qText });
      if (qId) {
        qIdToColKey.set(qId, colKey);
      }
      if (!rawTextToColKey.has(qText.toLowerCase())) {
        rawTextToColKey.set(qText.toLowerCase(), colKey);
      }
    });

    // Also scan all responses to ensure any extra/dynamic questions not in official list are included
    rawResponses.forEach((resp) => {
      (resp.answers || []).forEach((a) => {
        const qId = a.question
          ? String(a.question._id || a.question.id || a.question).trim()
          : a.questionId
          ? String(a.questionId).trim()
          : "";
        const qText = (a.questionText || "").trim();

        if (qId && qIdToColKey.has(qId)) return;

        const colKey = qId ? `qid_${qId}` : `dynamic_${qText}`;
        if (qIdToColKey.has(colKey)) return;

        const baseLabel = qText || (qId ? `Question ${qId}` : "Additional Question");
        const label = makeUniqueLabel(baseLabel);

        questionColumns.push({ key: colKey, label, qId, qText });
        if (qId) {
          qIdToColKey.set(qId, colKey);
        }
        if (qText && !rawTextToColKey.has(qText.toLowerCase())) {
          rawTextToColKey.set(qText.toLowerCase(), colKey);
        }
      });
    });

    // 4. Transform every response into allRecords using question column keys
    const allRecords = rawResponses.map((resp) => {
      const answersMap = {}; // { colKey: answerString }

      (resp.answers || []).forEach((a) => {
        const qId = a.question
          ? String(a.question._id || a.question.id || a.question).trim()
          : a.questionId
          ? String(a.questionId).trim()
          : "";
        const rawQText = (a.questionText || "").trim();

        let colKey = "";
        if (qId && qIdToColKey.has(qId)) {
          colKey = qIdToColKey.get(qId);
        } else if (rawQText && rawTextToColKey.has(rawQText.toLowerCase())) {
          colKey = rawTextToColKey.get(rawQText.toLowerCase());
        }

        if (!colKey) return;

        const ansText = buildAnswerText(a);
        if (ansText) {
          if (answersMap[colKey]) {
            answersMap[colKey] = `${answersMap[colKey]} ; ${ansText}`;
          } else {
            answersMap[colKey] = ansText;
          }
        }
      });

      const user = {
        userCode: resp.userCode || "",
        userName: resp.userName || resp.userCode || "",
        userMobile: resp.userMobile || "",
      };

      return { user, resp, answersMap };
    });

    return { allRecords, questionColumns };
  };

  // ---------------- CSV EXPORT ----------------
  const handleExportSurveyCSV = async (surveySummaryItem, dateFilterOverride = null) => {
    if (!surveySummaryItem) return;
    const activeFilter = dateFilterOverride || { startDate, endDate };

    try {
      setExportingSurveyId(surveySummaryItem.surveyId);
      toast.info("CSV export prepare ho raha hai...");

      const { allRecords, questionColumns } =
        await collectSurveyRecords(surveySummaryItem, activeFilter);

      if (allRecords.length === 0) {
        toast.error(
          activeFilter.startDate || activeFilter.endDate
            ? `Selected date range (${activeFilter.startDate || "Beginning"} to ${activeFilter.endDate || "Present"}) me koi response nahi mila.`
            : "Is survey ke liye export karne layak koi response nahi mila."
        );
        setExportingSurveyId(null);
        return;
      }

      const dateFilterText = activeFilter.startDate || activeFilter.endDate
        ? `${activeFilter.startDate || "Beginning"} to ${activeFilter.endDate || "Present"}`
        : "All Time";

      const rows = [];

      // Meta sheet jaisa top section CSV me bhi
      rows.push(["Survey Responses Export"]);
      rows.push(["Survey ID", surveySummaryItem.surveyId]);
      rows.push(["Survey Code", surveySummaryItem.surveyCode || "-"]);
      rows.push(["Survey Name", surveySummaryItem.name || "-"]);
      rows.push(["Date Filter", dateFilterText]);
      rows.push(["Total Responses Exported", allRecords.length]);
      rows.push(["Exported At (IST)", new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })]);
      rows.push([]);

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
        ...questionColumns.map((c) => c.label),
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
          ...questionColumns.map((c) => answersMap[c.key] ?? ""),
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
      const dateSuffix = getDateFilterSuffix(activeFilter.startDate, activeFilter.endDate);
      const safeName =
        (surveySummaryItem.name || "survey")
          .replace(/[^\w\-]+/g, "_")
          .substring(0, 70) + `_responses_export${dateSuffix}.csv`;
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
  const handleExportSurveyExcel = async (surveySummaryItem, dateFilterOverride = null) => {
    if (!surveySummaryItem) return;
    const activeFilter = dateFilterOverride || { startDate, endDate };

    try {
      setExportingSurveyId(surveySummaryItem.surveyId);
      toast.info("Excel export prepare ho raha hai...");

      const { allRecords, questionColumns } =
        await collectSurveyRecords(surveySummaryItem, activeFilter);

      if (allRecords.length === 0) {
        toast.error(
          activeFilter.startDate || activeFilter.endDate
            ? `Selected date range (${activeFilter.startDate || "Beginning"} to ${activeFilter.endDate || "Present"}) me koi response nahi mila.`
            : "Is survey ke liye export karne layak koi response nahi mila."
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

        questionColumns.forEach((c) => {
          baseRow[c.label] = answersMap[c.key] ?? "";
        });

        return baseRow;
      });

      const wb = XLSX.utils.book_new();

      const dateFilterText = activeFilter.startDate || activeFilter.endDate
        ? `${activeFilter.startDate || "Beginning"} to ${activeFilter.endDate || "Present"}`
        : "All Time";

      // Meta sheet
      const metaSheetData = [
        ["Survey Responses Export"],
        ["Survey ID", surveySummaryItem.surveyId],
        ["Survey Code", surveySummaryItem.surveyCode || "-"],
        ["Survey Name", surveySummaryItem.name || "-"],
        ["Date Filter", dateFilterText],
        ["Total Responses Exported", dataRows.length],
        ["Exported At (IST)", new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })],
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
      const dateSuffix = getDateFilterSuffix(activeFilter.startDate, activeFilter.endDate);
      const safeName =
        (surveySummaryItem.name || "survey")
          .replace(/[^\w\-]+/g, "_")
          .substring(0, 70) + `_responses_export${dateSuffix}.xlsx`;

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

  // ---------------- USER-WISE SURVEY & QC REPORT EXPORT ----------------
  const handleExportUserWiseReport = async (surveySummaryItem, dateFilterOverride = null) => {
    if (!surveySummaryItem) return;
    const activeFilter = dateFilterOverride || { startDate, endDate };

    try {
      setExportingSurveyId(surveySummaryItem.surveyId);
      toast.info("User-Wise Survey Report prepare ho raha hai...");

      const respRes = await getSurveyResponses(surveySummaryItem.surveyId, activeFilter);
      let rawResponses = respRes.responses || [];

      if (activeFilter.startDate || activeFilter.endDate) {
        rawResponses = rawResponses.filter((r) =>
          isWithinDateRange(r.createdAt, activeFilter.startDate, activeFilter.endDate)
        );
      }

      if (rawResponses.length === 0) {
        toast.error(
          activeFilter.startDate || activeFilter.endDate
            ? `Selected date range (${activeFilter.startDate || "Beginning"} to ${activeFilter.endDate || "Present"}) me koi response nahi mila.`
            : "Is survey ke liye export karne layak koi response nahi mila."
        );
        setExportingSurveyId(null);
        return;
      }

      // 1. Group responses by surveyor/user
      const userMap = new Map();
      let overallQcCompletedCount = 0;

      rawResponses.forEach((r) => {
        const uKey = String(r.userCode || r.userName || "UNKNOWN").trim();
        if (!userMap.has(uKey)) {
          userMap.set(uKey, {
            userCode: r.userCode || "-",
            userName: r.userName || r.userCode || "Unknown Surveyor",
            userMobile: r.userMobile || "-",
            userRole: r.userRole || "SURVEY_USER",
            totalCompleted: 0,
            validCount: 0,
            invalidCount: 0,
            pendingCount: 0,
            // Invalid reasons
            notAskingAllQuestions: 0,
            notDoingProperly: 0,
            takingFromFriends: 0,
            fakeOrEmptyAudio: 0,
            lastResponseAt: r.createdAt,
          });
        }

        const userStat = userMap.get(uKey);
        userStat.totalCompleted += 1;

        if (!userStat.lastResponseAt || new Date(r.createdAt) > new Date(userStat.lastResponseAt)) {
          userStat.lastResponseAt = r.createdAt;
        }

        const status = r.approvalStatus || (r.isApproved ? "CORRECTLY_DONE" : "PENDING");

        if (status === "CORRECTLY_DONE" || r.isApproved === true) {
          userStat.validCount += 1;
          overallQcCompletedCount += 1;
        } else if (status === "PENDING") {
          userStat.pendingCount += 1;
        } else {
          // Any rejection status
          userStat.invalidCount += 1;
          overallQcCompletedCount += 1;

          if (status === "NOT_ASKING_ALL_QUESTIONS") userStat.notAskingAllQuestions += 1;
          else if (status === "NOT_DOING_IT_PROPERLY") userStat.notDoingProperly += 1;
          else if (status === "TAKING_FROM_FRIENDS_OR_TEAMMATE") userStat.takingFromFriends += 1;
          else if (status === "FAKE_OR_EMPTY_AUDIO") userStat.fakeOrEmptyAudio += 1;
        }
      });

      const userList = Array.from(userMap.values());
      const isQcCompletedForSurvey = overallQcCompletedCount > 0;

      // 2. Build rows according to whether QC is completed or not
      let reportRows = [];

      if (isQcCompletedForSurvey) {
        // DETAILED COLUMNS: Valid vs Invalid survey counts per user
        reportRows = userList.map((u, idx) => {
          const validPct = u.totalCompleted > 0 ? ((u.validCount / u.totalCompleted) * 100).toFixed(1) + "%" : "0%";
          const qcStatus = u.pendingCount === 0 ? "QC Completed" : u.validCount + u.invalidCount > 0 ? "Partially QC'd" : "Pending QC";

          return {
            "S.No.": idx + 1,
            "User Code": u.userCode,
            "Surveyor Name": u.userName,
            "Mobile Number": u.userMobile,
            "Total Sample Completed": u.totalCompleted,
            "Valid Surveys (Approved)": u.validCount,
            "Invalid Surveys (Rejected)": u.invalidCount,
            "Pending QC": u.pendingCount,
            "QC Status": qcStatus,
            "Validation Rate": validPct,
            "Invalid: Not Asking All Questions": u.notAskingAllQuestions,
            "Invalid: Not Doing Properly": u.notDoingProperly,
            "Invalid: Taking From Teammate": u.takingFromFriends,
            "Invalid: Fake/Empty Audio": u.fakeOrEmptyAudio,
            "Last Submission Date (IST)": fmtDateTime(u.lastResponseAt),
          };
        });
      } else {
        // WHEN QC IS NOT COMPLETED: simply display Total Count of sample surveys completed by each user
        reportRows = userList.map((u, idx) => ({
          "S.No.": idx + 1,
          "User Code": u.userCode,
          "Surveyor Name": u.userName,
          "Mobile Number": u.userMobile,
          "Total Sample Surveys Completed": u.totalCompleted,
          "QC Status": "QC Not Completed / Pending",
          "Last Submission Date (IST)": fmtDateTime(u.lastResponseAt),
        }));
      }

      // 3. Create Excel Workbook with Meta sheet + User-Wise Report sheet
      const wb = XLSX.utils.book_new();

      const dateFilterText = activeFilter.startDate || activeFilter.endDate
        ? `${activeFilter.startDate || "Beginning"} to ${activeFilter.endDate || "Present"}`
        : "All Time";

      const metaSheetData = [
        ["User-Wise Survey Report"],
        ["Survey ID", surveySummaryItem.surveyId],
        ["Survey Code", surveySummaryItem.surveyCode || "-"],
        ["Survey Name", surveySummaryItem.name || "-"],
        ["Date Filter", dateFilterText],
        ["Total Survey Responses", rawResponses.length],
        ["Total Unique Surveyors", userList.length],
        ["QC Mode", isQcCompletedForSurvey ? "QC Completed (Valid vs Invalid Breakdown)" : "QC Not Completed (Sample Survey Counts)"],
        ["Exported At (IST)", new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })],
      ];
      const metaWs = XLSX.utils.aoa_to_sheet(metaSheetData);
      XLSX.utils.book_append_sheet(wb, metaWs, "Summary");

      const reportWs = XLSX.utils.json_to_sheet(reportRows);
      XLSX.utils.book_append_sheet(wb, reportWs, "User-Wise Report");

      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateSuffix = getDateFilterSuffix(activeFilter.startDate, activeFilter.endDate);
      const safeName =
        (surveySummaryItem.name || "survey")
          .replace(/[^\w\-]+/g, "_")
          .substring(0, 70) + `_user_wise_report${dateSuffix}.xlsx`;

      link.href = url;
      link.setAttribute("download", safeName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("User-Wise Survey Report successfully exported!");
    } catch (err) {
      console.error("handleExportUserWiseReport error:", err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to export User-Wise Survey Report.");
    } finally {
      setExportingSurveyId(null);
    }
  };

  // ---------------- QC USER REPORT EXPORT ----------------
  const handleExportQCUserReport = async (surveySummaryItem, dateFilterOverride = null) => {
    if (!surveySummaryItem) return;
    const activeFilter = dateFilterOverride || { startDate, endDate };

    try {
      setExportingSurveyId(surveySummaryItem.surveyId);
      toast.info("QC User Report prepare ho raha hai...");

      const respRes = await getSurveyResponses(surveySummaryItem.surveyId, activeFilter);
      let rawResponses = respRes.responses || [];

      if (activeFilter.startDate || activeFilter.endDate) {
        rawResponses = rawResponses.filter((r) =>
          isWithinDateRange(r.createdAt, activeFilter.startDate, activeFilter.endDate)
        );
      }

      if (rawResponses.length === 0) {
        toast.error(
          activeFilter.startDate || activeFilter.endDate
            ? `Selected date range (${activeFilter.startDate || "Beginning"} to ${activeFilter.endDate || "Present"}) me koi response nahi mila.`
            : "Is survey ke liye export karne layak koi sample response nahi mila."
        );
        setExportingSurveyId(null);
        return;
      }

      // 1. Calculate per-surveyor metrics (Total Samples & Total Approved)
      const surveyorMetrics = new Map();
      rawResponses.forEach((r) => {
        const uKey = String(r.userCode || r.userName || "UNKNOWN").trim();
        if (!surveyorMetrics.has(uKey)) {
          surveyorMetrics.set(uKey, {
            userName: r.userName || r.userCode || "Unknown Surveyor",
            userCode: r.userCode || "-",
            userMobile: r.userMobile || "-",
            totalSubmitted: 0,
            totalApproved: 0,
            totalRejected: 0,
            totalPending: 0,
          });
        }
        const sm = surveyorMetrics.get(uKey);
        sm.totalSubmitted += 1;
        const status = r.approvalStatus || (r.isApproved ? "CORRECTLY_DONE" : "PENDING");
        if (status === "CORRECTLY_DONE" || r.isApproved === true) {
          sm.totalApproved += 1;
        } else if (status === "PENDING") {
          sm.totalPending += 1;
        } else {
          sm.totalRejected += 1;
        }
      });

      // 2. Remarks mapping for inspection comments
      const getQcRemarksAndStatus = (status, isApproved) => {
        switch (status) {
          case "CORRECTLY_DONE":
            return {
              statusText: "Correctly Done (Approved)",
              remarks: "Audio and responses verified clear & compliant",
            };
          case "NOT_ASKING_ALL_QUESTIONS":
            return {
              statusText: "Rejected: Incomplete Interview",
              remarks: "Surveyor skipped mandatory survey questions during interview",
            };
          case "NOT_DOING_IT_PROPERLY":
            return {
              statusText: "Rejected: Protocol Violation",
              remarks: "Interview protocol not followed properly / surveyor rushed",
            };
          case "TAKING_FROM_FRIENDS_OR_TEAMMATE":
            return {
              statusText: "Rejected: Proxy / Teammate",
              remarks: "Responses recorded from teammates or friends instead of respondent",
            };
          case "FAKE_OR_EMPTY_AUDIO":
            return {
              statusText: "Rejected: Fake / Corrupted Audio",
              remarks: "Audio contains blank silence, background noise, or fake recording",
            };
          case "PENDING":
          default:
            return isApproved
              ? {
                  statusText: "Correctly Done (Approved)",
                  remarks: "Verified & approved",
                }
              : {
                  statusText: "Pending QC Review",
                  remarks: "Awaiting inspection by QC Engineer",
                };
        }
      };

      // 3. Build Sample-Level Detailed Rows
      const detailedSampleRows = rawResponses.map((r, idx) => {
        const uKey = String(r.userCode || r.userName || "UNKNOWN").trim();
        const surveyor = surveyorMetrics.get(uKey) || {};
        const { statusText, remarks } = getQcRemarksAndStatus(r.approvalStatus, r.isApproved);

        return {
          "S.No.": idx + 1,
          "Sample ID": String(r.responseId || r._id || `SMP-${idx + 1}`),
          "Surveyor Name": surveyor.userName || r.userName || "-",
          "Surveyor Code": surveyor.userCode || r.userCode || "-",
          "Surveyor Mobile": surveyor.userMobile || r.userMobile || "-",
          "Total Samples Submitted": surveyor.totalSubmitted || 1,
          "Total Approved Samples": surveyor.totalApproved || 0,
          "QC Agent Name": r.approvedByName || "Pending / Unassigned",
          "QC Agent Code": r.approvedByUserCode || "-",
          "Sample Status": statusText,
          "QC Remarks / Comments": remarks,
          "Audio Review Link": r.audioUrl || "No Audio Recording",
          "Latitude": r.latitude || "-",
          "Longitude": r.longitude || "-",
          "Submission Date (IST)": fmtDateTime(r.createdAtIST || r.createdAt),
          "QC Verification Date": r.approvedAt ? fmtDateTime(r.approvedAt) : (r.isApproved ? fmtDateTime(r.updatedAt) : "Pending"),
        };
      });

      // 4. Build Surveyor Summary Rows
      const surveyorSummaryRows = Array.from(surveyorMetrics.values()).map((sm, idx) => ({
        "S.No.": idx + 1,
        "Surveyor Name": sm.userName,
        "Surveyor Code": sm.userCode,
        "Mobile Number": sm.userMobile,
        "Total Samples Submitted": sm.totalSubmitted,
        "Total Approved Samples": sm.totalApproved,
        "Total Rejected Samples": sm.totalRejected,
        "Pending QC Samples": sm.totalPending,
        "Approval Rate (%)": sm.totalSubmitted > 0 ? ((sm.totalApproved / sm.totalSubmitted) * 100).toFixed(1) + "%" : "0%",
      }));

      // 5. Create Excel Workbook
      const wb = XLSX.utils.book_new();

      const dateFilterText = activeFilter.startDate || activeFilter.endDate
        ? `${activeFilter.startDate || "Beginning"} to ${activeFilter.endDate || "Present"}`
        : "All Time";

      const metaSheetData = [
        ["QC User Report - Survey Verification & Audio Review"],
        ["Survey ID", surveySummaryItem.surveyId],
        ["Survey Code", surveySummaryItem.surveyCode || "-"],
        ["Survey Name", surveySummaryItem.name || "-"],
        ["Date Filter", dateFilterText],
        ["Total Samples Submitted", rawResponses.length],
        ["Total Unique Surveyors", surveyorMetrics.size],
        ["Exported At (IST)", new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })],
      ];
      const metaWs = XLSX.utils.aoa_to_sheet(metaSheetData);
      XLSX.utils.book_append_sheet(wb, metaWs, "Report Overview");

      const samplesWs = XLSX.utils.json_to_sheet(detailedSampleRows);
      XLSX.utils.book_append_sheet(wb, samplesWs, "QC Sample Details");

      const surveyorsWs = XLSX.utils.json_to_sheet(surveyorSummaryRows);
      XLSX.utils.book_append_sheet(wb, surveyorsWs, "Surveyor QC Summary");

      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateSuffix = getDateFilterSuffix(activeFilter.startDate, activeFilter.endDate);
      const safeName =
        (surveySummaryItem.name || "survey")
          .replace(/[^\w\-]+/g, "_")
          .substring(0, 70) + `_QC_User_Report${dateSuffix}.xlsx`;

      link.href = url;
      link.setAttribute("download", safeName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("QC User Report successfully exported!");
    } catch (err) {
      console.error("handleExportQCUserReport error:", err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to export QC User Report.");
    } finally {
      setExportingSurveyId(null);
    }
  };

  // ---------------- SURVEYOR WISE DATA REPORT (LIGHTWEIGHT QC SUMMARY) ----------------
  const handleExportSurveyorWiseQCReport = async (surveySummaryItem, dateFilterOverride = null) => {
    if (!surveySummaryItem) return;
    const activeFilter = dateFilterOverride || { startDate, endDate };

    try {
      setExportingSurveyId(surveySummaryItem.surveyId);
      toast.info("Surveyor Wise Data Report prepare ho raha hai...");

      const respRes = await getSurveyResponses(surveySummaryItem.surveyId, activeFilter);
      let rawResponses = respRes.responses || [];

      if (activeFilter.startDate || activeFilter.endDate) {
        rawResponses = rawResponses.filter((r) =>
          isWithinDateRange(r.createdAt, activeFilter.startDate, activeFilter.endDate)
        );
      }

      if (rawResponses.length === 0) {
        toast.error(
          activeFilter.startDate || activeFilter.endDate
            ? `Selected date range (${activeFilter.startDate || "Beginning"} to ${activeFilter.endDate || "Present"}) me koi response nahi mila.`
            : "Is survey ke liye export karne layak koi response nahi mila."
        );
        setExportingSurveyId(null);
        return;
      }

      // Strictly 4 columns only: QC User Name, Surveyor Name, Audio URL, QC Remark/Status
      const rows = rawResponses.map((r) => {
        let remarkStatus = "Pending";
        switch (r.approvalStatus) {
          case "CORRECTLY_DONE":
            remarkStatus = "Correctly Done";
            break;
          case "NOT_ASKING_ALL_QUESTIONS":
            remarkStatus = "Not asking all questions";
            break;
          case "NOT_DOING_IT_PROPERLY":
            remarkStatus = "Not doing it properly";
            break;
          case "TAKING_FROM_FRIENDS_OR_TEAMMATE":
            remarkStatus = "Taking from friends or teammate";
            break;
          case "FAKE_OR_EMPTY_AUDIO":
            remarkStatus = "Fake or empty audio";
            break;
          case "PENDING":
          default:
            remarkStatus = r.isApproved ? "Correctly Done" : "Pending";
            break;
        }

        return {
          "QC User Name": r.approvedByName || "Pending Review",
          "Surveyor Name": r.userName || r.userCode || "Unknown Surveyor",
          "Audio URL": r.audioUrl || "No Audio Recording",
          "QC Remark/Status": remarkStatus,
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Surveyor Wise QC");

      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateSuffix = getDateFilterSuffix(activeFilter.startDate, activeFilter.endDate);
      const safeName =
        (surveySummaryItem.name || "survey")
          .replace(/[^\w\-]+/g, "_")
          .substring(0, 70) + `_Surveyor_Wise_QC_Report${dateSuffix}.xlsx`;

      link.href = url;
      link.setAttribute("download", safeName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Surveyor Wise Data Report successfully exported!");
    } catch (err) {
      console.error("handleExportSurveyorWiseQCReport error:", err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to export Surveyor Wise Data Report.");
    } finally {
      setExportingSurveyId(null);
    }
  };

  // ---- Loading & error for main ----
  if (loading && (!summary || summary.length === 0)) {
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenAudioId((prev) =>
                                prev === respKey ? null : respKey
                              )
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer"
                            style={{
                              borderColor: themeColors.primary,
                              color: themeColors.primary,
                              backgroundColor: themeColors.background,
                            }}
                          >
                            <FaHeadphones />
                            {isAudioOpen ? "Hide Audio" : "Listen Audio"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyAudioLink(resp.audioUrl)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer"
                            style={{
                              borderColor: themeColors.border,
                              color: themeColors.text,
                              backgroundColor: themeColors.surface,
                            }}
                            title="Copy Audio Link"
                          >
                            <FaCopy />
                            <span>Copy Link</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleShareAudioLink(
                                resp.audioUrl,
                                `Audio Entry #${resp.responseId}`
                              )
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                            title="Share Link"
                          >
                            <FaShareAlt />
                            <span>Share</span>
                          </button>
                        </div>

                        {isAudioOpen && (
                          <audio
                            controls
                            autoPlay
                            className="w-full mt-1"
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
              <option value="All">All Statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          <div className="min-w-[170px]">
            <label
              className="text-xs mb-1 block opacity-70"
              style={{ color: themeColors.text }}
            >
              Sub Admin
            </label>
            <select
              className="w-full p-2 rounded-lg border text-sm"
              style={{
                borderColor: themeColors.border,
                backgroundColor: themeColors.background,
                color: themeColors.text,
              }}
              value={subAdminFilter}
              onChange={(e) => setSubAdminFilter(e.target.value)}
            >
              <option value="All">All Sub Admins</option>
              {subAdmins.map((sa) => (
                <option key={sa._id} value={sa._id}>
                  {sa.name} ({sa.adminId})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Filter Section */}
        <div
          className="mt-4 pt-3 border-t flex flex-col lg:flex-row lg:items-center justify-between gap-3"
          style={{ borderColor: themeColors.border }}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="text-xs font-semibold mr-1 flex items-center gap-1.5"
              style={{ color: themeColors.text }}
            >
              <FaCalendarAlt className="text-indigo-500" />
              <span>Date Filter:</span>
            </span>
            {[
              { id: "ALL", label: "All Time" },
              { id: "TODAY", label: "Today" },
              { id: "YESTERDAY", label: "Yesterday" },
              { id: "LAST_7", label: "Last 7 Days" },
              { id: "LAST_30", label: "Last 30 Days" },
              { id: "THIS_MONTH", label: "This Month" },
            ].map((p) => {
              const isActive = datePreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleApplyPreset(p.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    isActive
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                  style={{
                    borderColor: isActive ? themeColors.primary : themeColors.border,
                    color: isActive ? "#ffffff" : themeColors.text,
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] opacity-70" style={{ color: themeColors.text }}>From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleCustomDateChange(e.target.value, endDate)}
                className="px-2.5 py-1 rounded-lg border text-xs"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                }}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] opacity-70" style={{ color: themeColors.text }}>To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleCustomDateChange(startDate, e.target.value)}
                className="px-2.5 py-1 rounded-lg border text-xs"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                }}
              />
            </div>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={handleClearDateFilter}
                className="text-xs px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 transition-colors cursor-pointer font-medium"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Date Filter Active Pill */}
        {(startDate || endDate) && (
          <div className="mt-3 text-xs flex items-center justify-between px-3 py-1.5 rounded-lg bg-indigo-50/70 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60">
            <div className="flex items-center gap-2">
              <span className="font-semibold">⚡ Date Filter Active:</span>
              <span className="font-bold">{getDateFilterLabel(startDate, endDate)}</span>
              <span className="opacity-70 text-[11px] hidden sm:inline">— All report downloads will be filtered for this date range.</span>
            </div>
            <button
              type="button"
              onClick={handleClearDateFilter}
              className="text-[11px] font-semibold underline hover:text-indigo-900 dark:hover:text-indigo-100 cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}
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
                  "Sub Admin",
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

                  <td
                    className="px-4 py-3 text-xs"
                    style={{ color: themeColors.text }}
                  >
                    {s.createdByAdmin ? (
                      <span className="inline-flex items-center gap-1 font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2 py-0.5 rounded-md text-[11px]">
                        <FaUserShield className="text-[10px]" />
                        <span>{s.createdByAdmin.name || s.createdByAdmin.adminId}</span>
                      </span>
                    ) : (
                      <span className="opacity-40 text-xs">-</span>
                    )}
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
                    <div className="flex flex-col gap-1.5 min-w-[200px]">
                      {/* Date-Wise Modal button */}
                      <button
                        type="button"
                        onClick={() => openExportModal(s)}
                        title="Download reports by selecting custom date range"
                        className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all shadow-sm bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 cursor-pointer"
                      >
                        <FaCalendarAlt className="text-[10px]" />
                        <span>Date-Wise Download</span>
                      </button>

                      {/* Active date filter indicator on direct buttons */}
                      {(startDate || endDate) && (
                        <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium text-center bg-indigo-50/80 dark:bg-indigo-950/40 py-0.5 px-1.5 rounded border border-indigo-200/60 dark:border-indigo-800/40">
                          Active: {getDateFilterLabel(startDate, endDate)}
                        </div>
                      )}

                      {/* 1. Report 1: Raw Data Report */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleExportSurveyExcel(s)}
                          disabled={exportingSurveyId === s.surveyId}
                          title={startDate || endDate ? `Export Excel for ${getDateFilterLabel(startDate, endDate)}` : "Export complete raw survey data (All questions, answers & metadata)"}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold disabled:opacity-60 transition-colors"
                          style={{
                            borderColor: themeColors.primary,
                            backgroundColor: themeColors.surface,
                            color: themeColors.primary,
                          }}
                        >
                          <FaFileExcel />
                          <span>Raw Data (Excel)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportSurveyCSV(s)}
                          disabled={exportingSurveyId === s.surveyId}
                          title={startDate || endDate ? `Export CSV for ${getDateFilterLabel(startDate, endDate)}` : "Export complete raw survey data as CSV"}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold disabled:opacity-60 transition-colors"
                          style={{
                            borderColor: themeColors.primary,
                            backgroundColor: themeColors.surface,
                            color: themeColors.primary,
                          }}
                        >
                          <FaFileExcel />
                          <span>CSV</span>
                        </button>
                      </div>

                      {/* 2. Report 2: Surveyor Wise Data Report (Lightweight 4-Column QC Summary) - Right below Raw Data */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleExportSurveyorWiseQCReport(s)}
                          disabled={exportingSurveyId === s.surveyId}
                          title={startDate || endDate ? `Export Surveyor Wise Data Report for ${getDateFilterLabel(startDate, endDate)}` : "Export Surveyor Wise Data Report (Strictly: QC User Name, Surveyor Name, Audio URL, QC Remark/Status)"}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold disabled:opacity-60 transition-colors shadow-sm bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                        >
                          <FaHeadphones />
                          <span>Surveyor Wise Data Report</span>
                        </button>
                      </div>

                      {/* Additional User-Wise Summary Option */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleExportUserWiseReport(s)}
                          disabled={exportingSurveyId === s.surveyId}
                          title={startDate || endDate ? `Export User-Wise Survey Report for ${getDateFilterLabel(startDate, endDate)}` : "Export User-Wise Survey Report (Valid vs Invalid Counts / Total Samples)"}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold disabled:opacity-60 transition-colors shadow-sm bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                        >
                          <FaUserCheck />
                          <span>User-Wise Report</span>
                        </button>
                      </div>
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

      {/* DATE-WISE EXPORT MODAL */}
      {exportModalSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div
            className="rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border my-8"
            style={{
              backgroundColor: themeColors.surface,
              borderColor: themeColors.border,
            }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                  <FaFileExcel className="text-xl text-yellow-300" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Download Reports (Date-Wise)</h2>
                  <p className="text-xs text-indigo-100 font-medium">
                    {exportModalSurvey.name} ({exportModalSurvey.surveyCode})
                  </p>
                </div>
              </div>
              <button
                onClick={closeExportModal}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors cursor-pointer text-white"
              >
                <FaTimes className="text-lg" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Date Filter Box */}
              <div
                className="p-4 rounded-xl border space-y-3"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background + "40",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: themeColors.primary }}>
                    <FaCalendarAlt /> Select Date Range
                  </span>
                  {(modalStartDate || modalEndDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        setModalDatePreset("ALL");
                        setModalStartDate("");
                        setModalEndDate("");
                      }}
                      className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 cursor-pointer"
                    >
                      Clear Filter (All Time)
                    </button>
                  )}
                </div>

                {/* Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "ALL", label: "All Time" },
                    { id: "TODAY", label: "Today" },
                    { id: "YESTERDAY", label: "Yesterday" },
                    { id: "LAST_7", label: "Last 7 Days" },
                    { id: "LAST_30", label: "Last 30 Days" },
                    { id: "THIS_MONTH", label: "This Month" },
                  ].map((p) => {
                    const isActive = modalDatePreset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleApplyModalPreset(p.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          isActive
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                        style={{
                          borderColor: isActive ? themeColors.primary : themeColors.border,
                          color: isActive ? "#ffffff" : themeColors.text,
                        }}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                {/* Date inputs */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-medium mb-1 opacity-70" style={{ color: themeColors.text }}>
                      From Date
                    </label>
                    <input
                      type="date"
                      value={modalStartDate}
                      onChange={(e) => {
                        setModalDatePreset("CUSTOM");
                        setModalStartDate(e.target.value);
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border text-xs"
                      style={{
                        borderColor: themeColors.border,
                        backgroundColor: themeColors.surface,
                        color: themeColors.text,
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1 opacity-70" style={{ color: themeColors.text }}>
                      To Date
                    </label>
                    <input
                      type="date"
                      value={modalEndDate}
                      onChange={(e) => {
                        setModalDatePreset("CUSTOM");
                        setModalEndDate(e.target.value);
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border text-xs"
                      style={{
                        borderColor: themeColors.border,
                        backgroundColor: themeColors.surface,
                        color: themeColors.text,
                      }}
                    />
                  </div>
                </div>

                <div className="text-[11px] font-medium opacity-80 pt-1" style={{ color: themeColors.text }}>
                  Selected Range: <span className="font-bold text-indigo-600 dark:text-indigo-400">{getDateFilterLabel(modalStartDate, modalEndDate)}</span>
                </div>
              </div>

              {/* Download Buttons */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider opacity-75" style={{ color: themeColors.text }}>
                  Select Report to Download
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Surveyor Wise QC Report */}
                  <button
                    type="button"
                    disabled={exportingSurveyId === (exportModalSurvey.surveyId || exportModalSurvey.surveyCode)}
                    onClick={() => handleExportSurveyorWiseQCReport(exportModalSurvey, { startDate: modalStartDate, endDate: modalEndDate })}
                    className="flex items-start gap-3 p-3.5 rounded-xl border text-left hover:border-purple-500 hover:shadow-md transition-all cursor-pointer group bg-purple-50/50 dark:bg-purple-950/20"
                    style={{ borderColor: themeColors.border }}
                  >
                    <div className="p-2 bg-purple-600 text-white rounded-lg group-hover:scale-105 transition-transform">
                      <FaHeadphones className="text-base" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-purple-700 dark:text-purple-300">Surveyor Wise QC Report</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">QC User, Surveyor Name, Audio URL & QC Remark (.xlsx)</div>
                    </div>
                  </button>

                  {/* User-Wise Report */}
                  <button
                    type="button"
                    disabled={exportingSurveyId === (exportModalSurvey.surveyId || exportModalSurvey.surveyCode)}
                    onClick={() => handleExportUserWiseReport(exportModalSurvey, { startDate: modalStartDate, endDate: modalEndDate })}
                    className="flex items-start gap-3 p-3.5 rounded-xl border text-left hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group bg-emerald-50/50 dark:bg-emerald-950/20"
                    style={{ borderColor: themeColors.border }}
                  >
                    <div className="p-2 bg-emerald-600 text-white rounded-lg group-hover:scale-105 transition-transform">
                      <FaUserCheck className="text-base" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">User-Wise Report</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">Surveyor performance, Valid vs Invalid & QC breakdown (.xlsx)</div>
                    </div>
                  </button>

                  {/* Raw Data Report (Excel) */}
                  <button
                    type="button"
                    disabled={exportingSurveyId === (exportModalSurvey.surveyId || exportModalSurvey.surveyCode)}
                    onClick={() => handleExportSurveyExcel(exportModalSurvey, { startDate: modalStartDate, endDate: modalEndDate })}
                    className="flex items-start gap-3 p-3.5 rounded-xl border text-left hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group bg-blue-50/50 dark:bg-blue-950/20"
                    style={{ borderColor: themeColors.border }}
                  >
                    <div className="p-2 bg-blue-600 text-white rounded-lg group-hover:scale-105 transition-transform">
                      <FaFileExcel className="text-base" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-blue-700 dark:text-blue-300">Raw Data Report (Excel)</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">All questions, answers, locations & metadata (.xlsx)</div>
                    </div>
                  </button>

                  {/* Raw Data (CSV) */}
                  <button
                    type="button"
                    disabled={exportingSurveyId === (exportModalSurvey.surveyId || exportModalSurvey.surveyCode)}
                    onClick={() => handleExportSurveyCSV(exportModalSurvey, { startDate: modalStartDate, endDate: modalEndDate })}
                    className="flex items-start gap-3 p-3.5 rounded-xl border text-left hover:border-amber-500 hover:shadow-md transition-all cursor-pointer group bg-amber-50/50 dark:bg-amber-950/20"
                    style={{ borderColor: themeColors.border }}
                  >
                    <div className="p-2 bg-amber-600 text-white rounded-lg group-hover:scale-105 transition-transform">
                      <FaFileExcel className="text-base" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-amber-700 dark:text-amber-300">Raw Data (CSV)</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">Plain CSV format for large datasets & scripting (.csv)</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t flex justify-end" style={{ borderColor: themeColors.border }}>
              <button
                type="button"
                onClick={closeExportModal}
                className="px-4 py-2 rounded-xl text-xs font-medium border hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                style={{ borderColor: themeColors.border, color: themeColors.text }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

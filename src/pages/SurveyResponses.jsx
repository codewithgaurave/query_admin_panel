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
} from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import {
  listSurveyResponseSummary,
  getUserSurveySummary,
} from "../apis/surveys";

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

export default function SurveyResponses() {
  const { themeColors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState([]); // [{surveyId,...}]
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState(null); // from summary
  const [selectedUser, setSelectedUser] = useState(null); // { userCode, userName, userMobile }
  const [userLoading, setUserLoading] = useState(false);
  const [userSurveyData, setUserSurveyData] = useState(null); // full payload from API

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

  // modal open helper
  const openUserModal = async (survey, user) => {
    setSelectedSurvey(survey);
    setSelectedUser(user);
    setModalOpen(true);
    setUserSurveyData(null);

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

  const closeModal = () => {
    setModalOpen(false);
    setSelectedSurvey(null);
    setSelectedUser(null);
    setUserSurveyData(null);
  };

  // ---- UI ----
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

  return (
    <div className="relative space-y-6">
      {/* Header */}
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
            Dekho kaun-kaun se surveys pe kitne responses aaye aur kis user ne
            kya answers diye.
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
              placeholder="Search by survey name, code, project, category"
              className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm"
              style={{
                borderColor: themeColors.border,
                backgroundColor: themeColors.background,
                color: themeColors.text,
              }}
            />
          </div>

          {/* Status filter */}
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

      {/* Summary table */}
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
                  {/* Survey name */}
                  <td className="px-4 py-3">
                    <div
                      className="font-medium"
                      style={{ color: themeColors.text }}
                    >
                      {s.name}
                    </div>
                  </td>

                  {/* Code */}
                  <td
                    className="px-4 py-3 text-xs font-mono"
                    style={{ color: themeColors.text }}
                  >
                    {s.surveyCode}
                  </td>

                  {/* Status */}
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

                  {/* Category */}
                  <td
                    className="px-4 py-3 text-xs"
                    style={{ color: themeColors.text }}
                  >
                    {s.category || "-"}
                  </td>

                  {/* Project */}
                  <td
                    className="px-4 py-3 text-xs"
                    style={{ color: themeColors.text }}
                  >
                    {s.projectName || "-"}
                  </td>

                  {/* Total responses */}
                  <td
                    className="px-4 py-3 text-xs font-semibold"
                    style={{ color: themeColors.primary }}
                  >
                    {s.totalResponses}
                  </td>

                  {/* Users */}
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
                            onClick={() => openUserModal(s, u)}
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

                  {/* Last response */}
                  <td
                    className="px-4 py-3 text-xs"
                    style={{ color: themeColors.text }}
                  >
                    {fmtDateTime(s.lastResponseAt)}
                  </td>
                </tr>
              ))}

              {filteredSummary.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
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

      {/* MODAL – user detailed responses */}
      {modalOpen && (
        <>
          {/* overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-40 z-40"
            onClick={closeModal}
          />

          {/* modal box */}
          <div className="fixed inset-0 z-50 flex items-center justify-center px-2 sm:px-4">
            <div
              className="w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-xl flex flex-col"
              style={{
                backgroundColor: themeColors.surface,
                border: `1px solid ${themeColors.border}`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* header */}
              <div
                className="flex items-center justify-between px-4 sm:px-6 py-3 border-b"
                style={{ borderColor: themeColors.border }}
              >
                <div>
                  <p
                    className="text-xs uppercase font-semibold opacity-70"
                    style={{ color: themeColors.text }}
                  >
                    User Responses
                  </p>
                  <p
                    className="text-sm sm:text-base font-semibold flex items-center gap-2"
                    style={{ color: themeColors.text }}
                  >
                    <FaUser />
                    {selectedUser?.userName || selectedUser?.userCode}
                  </p>
                  <p
                    className="text-[11px] opacity-70"
                    style={{ color: themeColors.text }}
                  >
                    {selectedUser?.userCode}
                    {selectedUser?.userMobile
                      ? ` · ${selectedUser.userMobile}`
                      : ""}
                  </p>
                  {selectedSurvey && (
                    <p
                      className="text-[11px] mt-1"
                      style={{ color: themeColors.text }}
                    >
                      Survey:{" "}
                      <span className="font-semibold">
                        {selectedSurvey.name}
                      </span>{" "}
                      ({selectedSurvey.surveyCode})
                    </p>
                  )}
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 rounded-full border"
                  style={{
                    borderColor: themeColors.border,
                    color: themeColors.text,
                    backgroundColor: themeColors.background,
                  }}
                >
                  <FaTimes />
                </button>
              </div>

              {/* body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {userLoading && (
                  <div className="flex items-center justify-center py-6">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto" />
                      <p
                        className="mt-2 text-xs"
                        style={{ color: themeColors.text }}
                      >
                        Loading user responses...
                      </p>
                    </div>
                  </div>
                )}

                {!userLoading && !userSurveyData && (
                  <p
                    className="text-sm opacity-75"
                    style={{ color: themeColors.text }}
                  >
                    No data found.
                  </p>
                )}

                {!userLoading && userSurveyData && (
                  <>
                    {(() => {
                      const surveyItem =
                        userSurveyData.surveys?.find(
                          (sv) =>
                            String(sv.surveyId) ===
                              String(selectedSurvey?.surveyId) ||
                            sv.surveyCode === selectedSurvey?.surveyCode
                        ) || null;

                      if (!surveyItem) {
                        return (
                          <p
                            className="text-sm opacity-75"
                            style={{ color: themeColors.text }}
                          >
                            Is user ne is survey ka koi response nahi diya (ya
                            data migrate nahi hua).
                          </p>
                        );
                      }

                      if (
                        !surveyItem.responses ||
                        surveyItem.responses.length === 0
                      ) {
                        return (
                          <p
                            className="text-sm opacity-75"
                            style={{ color: themeColors.text }}
                          >
                            Is survey ke liye is user ka koi response record
                            nahi mila.
                          </p>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          {surveyItem.responses.map((resp, idx) => (
                            <div
                              key={resp.responseId || idx}
                              className="rounded-xl border p-3 sm:p-4 space-y-3"
                              style={{
                                borderColor: themeColors.border,
                                backgroundColor: themeColors.background,
                              }}
                            >
                              {/* Response header */}
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div>
                                  <p
                                    className="text-xs font-semibold"
                                    style={{ color: themeColors.text }}
                                  >
                                    Response #
                                    {surveyItem.responses.length - idx}
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
                                </div>
                                {resp.audioUrl && (
                                  <a
                                    href={resp.audioUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[11px] font-semibold self-start sm:self-auto"
                                    style={{
                                      borderColor: themeColors.primary,
                                      color: themeColors.primary,
                                      backgroundColor: themeColors.surface,
                                    }}
                                  >
                                    <FaHeadphones />
                                    Listen Audio
                                  </a>
                                )}
                              </div>

                              <hr
                                className="border-t my-1"
                                style={{ borderColor: themeColors.border }}
                              />

                              {/* Q&A list */}
                              <div className="mt-1 space-y-3">
                                {(resp.answers || []).map((a, qIndex) => {
                                  let answerText = "-";

                                  if (a.questionType === "OPEN_ENDED") {
                                    answerText = a.answerText || "-";
                                  } else if (a.questionType === "RATING") {
                                    answerText =
                                      typeof a.rating === "number"
                                        ? String(a.rating)
                                        : "-";
                                  } else {
                                    const opts = a.selectedOptions || [];
                                    answerText =
                                      opts.length > 0 ? opts.join(", ") : "-";
                                  }

                                  return (
                                    <div
                                      key={a.questionId || qIndex}
                                      className="rounded-lg border p-2.5 sm:p-3"
                                      style={{
                                        borderColor: themeColors.border,
                                        backgroundColor: themeColors.surface,
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
                                          <span className="font-semibold">
                                            Answer:{" "}
                                          </span>
                                          {answerText}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>

              {/* footer (optional) */}
              <div
                className="px-4 sm:px-6 py-3 border-t flex justify-end"
                style={{ borderColor: themeColors.border }}
              >
                <button
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg text-sm font-semibold border"
                  style={{
                    borderColor: themeColors.border,
                    color: themeColors.text,
                    backgroundColor: themeColors.surface,
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

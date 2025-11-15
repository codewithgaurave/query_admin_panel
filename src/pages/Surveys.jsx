// src/pages/Surveys.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  FaClipboardList,
  FaPlus,
  FaSearch,
  FaFilter,
  FaRegClock,
  FaPlay,
  FaStopCircle,
  FaUsersCog,
  FaTags,
  FaProjectDiagram,
  FaUserFriends,
  FaLanguage,
  FaCheckCircle,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import {
  createSurvey,
  listSurveys,
  updateSurvey,
  deleteSurvey,
} from "../apis/surveys";

const SURVEY_STATUSES = ["DRAFT", "ACTIVE", "CLOSED"];

const QUESTION_TYPES = [
  "OPEN_ENDED",
  "MCQ_SINGLE",
  "RATING",
  "LIKERT",
  "CHECKBOX",
  "DROPDOWN",
  "YES_NO",
];

const fmtDate = (d) => {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return "-";
  }
};

export default function Surveys() {
  const { themeColors } = useTheme();

  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  // create / edit survey
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingSurveyId, setEditingSurveyId] = useState(null);
  const isEditing = !!editingSurveyId;

  const emptySurveyForm = {
    name: "",
    description: "",
    category: "",
    projectName: "",
    targetAudience: "",
    status: "DRAFT",
    startDate: "",
    endDate: "",
    isAnonymousAllowed: false,
    maxResponses: "",
    language: "hi",
    tags: "",
    allowedQuestionTypes: [],
  };

  const [newSurvey, setNewSurvey] = useState(emptySurveyForm);

  // load surveys
  const loadSurveys = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await listSurveys();
      setSurveys(res.surveys || []);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load surveys.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSurveys();
  }, []);

  // derived data
  const categories = useMemo(() => {
    const set = new Set();
    surveys.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set);
  }, [surveys]);

  const filteredSurveys = useMemo(() => {
    const q = search.trim().toLowerCase();
    return surveys.filter((s) => {
      const statusOk =
        statusFilter === "All"
          ? true
          : String(s.status) === String(statusFilter);
      const catOk =
        categoryFilter === "All"
          ? true
          : String(s.category) === String(categoryFilter);

      const searchOk =
        !q ||
        [
          s.name,
          s.surveyCode,
          s.category,
          s.projectName,
          s.targetAudience,
          s.description,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));

      return statusOk && catOk && searchOk;
    });
  }, [surveys, search, statusFilter, categoryFilter]);

  const stats = useMemo(() => {
    const total = surveys.length;
    const drafts = surveys.filter((s) => s.status === "DRAFT").length;
    const active = surveys.filter((s) => s.status === "ACTIVE").length;
    const closed = surveys.filter((s) => s.status === "CLOSED").length;

    return [
      {
        title: "Total Surveys",
        value: total,
        icon: FaClipboardList,
        description: "All surveys in system",
      },
      {
        title: "Draft",
        value: drafts,
        icon: FaRegClock,
        description: "Not yet live",
      },
      {
        title: "Active",
        value: active,
        icon: FaPlay,
        description: "Currently running",
      },
      {
        title: "Closed",
        value: closed,
        icon: FaStopCircle,
        description: "Completed / archived",
      },
    ];
  }, [surveys]);

  // handlers
  const handleCreateChange = (field, value) => {
    setNewSurvey((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleQuestionType = (type) => {
    setNewSurvey((prev) => {
      const exists = prev.allowedQuestionTypes.includes(type);
      if (exists) {
        return {
          ...prev,
          allowedQuestionTypes: prev.allowedQuestionTypes.filter(
            (t) => t !== type
          ),
        };
      }
      return {
        ...prev,
        allowedQuestionTypes: [...prev.allowedQuestionTypes, type],
      };
    });
  };

  const resetForm = () => {
    setNewSurvey(emptySurveyForm);
    setEditingSurveyId(null);
  };

  const handleOpenCreate = () => {
    if (createOpen && isEditing) {
      // closing while editing -> reset
      resetForm();
    }
    setCreateOpen((o) => !o);
    if (!createOpen && !isEditing) {
      // new open in create mode -> ensure blank
      resetForm();
    }
  };

  const startEditSurvey = (survey) => {
    setEditingSurveyId(survey._id || survey.surveyCode);
    setCreateOpen(true);
    setNewSurvey((prev) => ({
      ...prev,
      name: survey.name || "",
      description: survey.description || "",
      category: survey.category || "",
      projectName: survey.projectName || "",
      targetAudience: survey.targetAudience || "",
      status: survey.status || "DRAFT",
      startDate: survey.startDate
        ? new Date(survey.startDate).toISOString().slice(0, 10)
        : "",
      endDate: survey.endDate
        ? new Date(survey.endDate).toISOString().slice(0, 10)
        : "",
      // baaki fields (maxResponses, tags, etc.) ko edit UI me nahi dikha rahe
      isAnonymousAllowed: false,
      maxResponses: "",
      language: "hi",
      tags: "",
      allowedQuestionTypes: [],
    }));
  };

  const handleDeleteSurvey = async (survey) => {
    const label = survey.name || survey.surveyCode;
    const ok = window.confirm(
      `Are you sure you want to delete survey "${label}"? This will also delete all its questions.`
    );
    if (!ok) return;

    try {
      const idOrCode = survey._id || survey.surveyCode;
      const res = await deleteSurvey(idOrCode);
      setSurveys((prev) =>
        prev.filter((s) => (s._id || s.surveyCode) !== idOrCode)
      );
      toast.success(res?.message || "Survey deleted successfully");
      if (editingSurveyId === idOrCode) {
        resetForm();
        setCreateOpen(false);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to delete survey.";
      toast.error(msg);
    }
  };

  const handleSurveySubmit = async (e) => {
    e.preventDefault();
    if (!newSurvey.name) {
      toast.error("Survey name is required.");
      return;
    }

    try {
      setSaving(true);

      if (!isEditing) {
        // CREATE
        const payload = {
          name: newSurvey.name,
          description: newSurvey.description || undefined,
          category: newSurvey.category || undefined,
          projectName: newSurvey.projectName || undefined,
          targetAudience: newSurvey.targetAudience || undefined,
          status: newSurvey.status || "DRAFT",
          startDate: newSurvey.startDate || undefined,
          endDate: newSurvey.endDate || undefined,
          isAnonymousAllowed: newSurvey.isAnonymousAllowed,
          maxResponses: newSurvey.maxResponses
            ? Number(newSurvey.maxResponses)
            : undefined,
          language: newSurvey.language || "hi",
          tags: newSurvey.tags
            ? newSurvey.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : undefined,
          allowedQuestionTypes:
            newSurvey.allowedQuestionTypes.length > 0
              ? newSurvey.allowedQuestionTypes
              : undefined,
        };

        const res = await createSurvey(payload);
        const created = res?.survey;
        if (created) {
          setSurveys((prev) => [created, ...prev]);
        }
        toast.success(res?.message || "Survey created successfully");

        resetForm();
        setCreateOpen(false);
      } else {
        // UPDATE — abhi basic fields hi update kar rahe hain
        const payload = {
          name: newSurvey.name,
          description: newSurvey.description || undefined,
          category: newSurvey.category || undefined,
          projectName: newSurvey.projectName || undefined,
          targetAudience: newSurvey.targetAudience || undefined,
          status: newSurvey.status || "DRAFT",
          startDate: newSurvey.startDate || undefined,
          endDate: newSurvey.endDate || undefined,
          // NOTE: yahan maxResponses / tags / language intentionally nahi bhej rahe
        };

        const res = await updateSurvey(editingSurveyId, payload);
        const updated = res?.survey;
        if (updated) {
          setSurveys((prev) =>
            prev.map((s) =>
              (s._id || s.surveyCode) === (updated._id || updated.surveyCode)
                ? updated
                : s
            )
          );
        }
        toast.success(res?.message || "Survey updated successfully");
        resetForm();
        setCreateOpen(false);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        (isEditing ? "Failed to update survey." : "Failed to create survey.");
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ---- UI ----
  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4" style={{ color: themeColors.text }}>
            Loading surveys...
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
            className="text-2xl md:text-3xl font-bold tracking-tight"
            style={{ color: themeColors.text }}
          >
            Survey Management
          </h1>
          <p
            className="text-sm mt-1 opacity-75"
            style={{ color: themeColors.text }}
          >
            Create surveys and manage survey questions for the auction/survey
            workflow.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 rounded-lg border flex items-center gap-2 text-sm font-semibold shadow-sm"
          style={{
            borderColor: themeColors.primary,
            backgroundColor: createOpen
              ? themeColors.primary
              : themeColors.surface,
            color: createOpen ? themeColors.onPrimary : themeColors.primary,
          }}
        >
          <FaPlus />
          {createOpen
            ? isEditing
              ? "Close Edit Survey"
              : "Close Create Survey"
            : isEditing
            ? "Edit Survey"
            : "Create Survey"}
        </button>
      </div>

      {/* Create / Edit Survey Card */}
      {createOpen && (
        <div
          className="rounded-xl border p-4 md:p-6 shadow-sm"
          style={{
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <h2
              className="text-lg font-semibold mb-2 flex items-center gap-2"
              style={{ color: themeColors.text }}
            >
              <FaClipboardList />
              {isEditing ? "Edit Survey" : "New Survey"}
            </h2>
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs underline"
                style={{ color: themeColors.primary }}
              >
                Switch to Create New
              </button>
            )}
          </div>
          <form
            onSubmit={handleSurveySubmit}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {/* Name */}
            <div className="lg:col-span-2">
              <label className="text-xs font-medium block mb-1">
                Survey Name *
              </label>
              <input
                type="text"
                value={newSurvey.name}
                onChange={(e) => handleCreateChange("name", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                }}
              />
            </div>

            {/* Status */}
            <div>
              <label className="text-xs font-medium block mb-1">Status</label>
              <select
                value={newSurvey.status}
                onChange={(e) =>
                  handleCreateChange("status", e.target.value)
                }
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                }}
              >
                {SURVEY_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className="text-xs font-medium block mb-1">
                Description
              </label>
              <textarea
                rows={2}
                value={newSurvey.description}
                onChange={(e) =>
                  handleCreateChange("description", e.target.value)
                }
                className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                }}
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-medium block mb-1 flex items-center gap-1">
                <FaTags />
                Category
              </label>
              <input
                type="text"
                value={newSurvey.category}
                onChange={(e) =>
                  handleCreateChange("category", e.target.value)
                }
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                }}
              />
            </div>

            {/* Project Name */}
            <div>
              <label className="text-xs font-medium block mb-1 flex items-center gap-1">
                <FaProjectDiagram />
                Project Name
              </label>
              <input
                type="text"
                value={newSurvey.projectName}
                onChange={(e) =>
                  handleCreateChange("projectName", e.target.value)
                }
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                }}
              />
            </div>

            {/* Target Audience */}
            <div>
              <label className="text-xs font-medium block mb-1 flex items-center gap-1">
                <FaUserFriends />
                Target Audience
              </label>
              <input
                type="text"
                value={newSurvey.targetAudience}
                onChange={(e) =>
                  handleCreateChange("targetAudience", e.target.value)
                }
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                }}
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="text-xs font-medium block mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={newSurvey.startDate}
                onChange={(e) =>
                  handleCreateChange("startDate", e.target.value)
                }
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                }}
              />
            </div>

            {/* End Date */}
            <div>
              <label className="text-xs font-medium block mb-1">End Date</label>
              <input
                type="date"
                value={newSurvey.endDate}
                onChange={(e) =>
                  handleCreateChange("endDate", e.target.value)
                }
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                }}
              />
            </div>

            {/* Max Responses, Language, Anonymous, Tags, Allowed Question Types
                👉 Ye sirf CREATE mode me dikhayenge, taaki edit ke time server ke
                unknown values overwrite na ho jayein. */}
            {!isEditing && (
              <>
                {/* Max Responses */}
                <div>
                  <label className="text-xs font-medium block mb-1">
                    Max Responses
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newSurvey.maxResponses}
                    onChange={(e) =>
                      handleCreateChange("maxResponses", e.target.value)
                    }
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{
                      borderColor: themeColors.border,
                      backgroundColor: themeColors.background,
                      color: themeColors.text,
                    }}
                  />
                </div>

                {/* Language */}
                <div>
                  <label className="text-xs font-medium block mb-1 flex items-center gap-1">
                    <FaLanguage />
                    Language
                  </label>
                  <select
                    value={newSurvey.language}
                    onChange={(e) =>
                      handleCreateChange("language", e.target.value)
                    }
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{
                      borderColor: themeColors.border,
                      backgroundColor: themeColors.background,
                      color: themeColors.text,
                    }}
                  >
                    <option value="hi">Hindi (hi)</option>
                    <option value="en">English (en)</option>
                  </select>
                </div>

                {/* Anonymous allowed */}
                <div className="flex items-center gap-2 mt-6">
                  <input
                    id="anonymousAllowed"
                    type="checkbox"
                    checked={newSurvey.isAnonymousAllowed}
                    onChange={(e) =>
                      handleCreateChange(
                        "isAnonymousAllowed",
                        e.target.checked
                      )
                    }
                    className="w-4 h-4"
                  />
                  <label
                    htmlFor="anonymousAllowed"
                    className="text-xs font-medium"
                    style={{ color: themeColors.text }}
                  >
                    Allow Anonymous Responses
                  </label>
                </div>

                {/* Tags */}
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="text-xs font-medium block mb-1 flex items-center gap-1">
                    <FaTags />
                    Tags <span className="opacity-60">(comma separated)</span>
                  </label>
                  <input
                    type="text"
                    value={newSurvey.tags}
                    onChange={(e) =>
                      handleCreateChange("tags", e.target.value)
                    }
                    placeholder="e.g. auction, city, pilot"
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{
                      borderColor: themeColors.border,
                      backgroundColor: themeColors.background,
                      color: themeColors.text,
                    }}
                  />
                </div>

                {/* Allowed Question Types */}
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="text-xs font-medium block mb-2 flex items-center gap-1">
                    <FaUsersCog />
                    Allowed Question Types (optional)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {QUESTION_TYPES.map((t) => {
                      const selected = newSurvey.allowedQuestionTypes.includes(
                        t
                      );
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => handleToggleQuestionType(t)}
                          className="px-3 py-1.5 rounded-full border text-xs flex items-center gap-1"
                          style={{
                            borderColor: selected
                              ? themeColors.primary
                              : themeColors.border,
                            backgroundColor: selected
                              ? themeColors.primary + "22"
                              : themeColors.surface,
                            color: selected
                              ? themeColors.primary
                              : themeColors.text,
                          }}
                        >
                          {selected && <FaCheckCircle />}
                          {t}
                        </button>
                      );
                    })}
                  </div>
                  <p
                    className="mt-1 text-[11px] opacity-70"
                    style={{ color: themeColors.text }}
                  >
                    If you leave this empty, all question types will be allowed
                    for this survey.
                  </p>
                </div>
              </>
            )}

            {/* Submit button */}
            <div className="md:col-span-2 lg:col-span-3 mt-2 flex justify-end gap-2">
              {isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setCreateOpen(false);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-semibold border shadow-sm"
                  style={{
                    borderColor: themeColors.border,
                    color: themeColors.text,
                    backgroundColor: themeColors.surface,
                  }}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-semibold shadow-sm"
                style={{
                  backgroundColor: themeColors.primary,
                  color: themeColors.onPrimary,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving
                  ? isEditing
                    ? "Updating..."
                    : "Creating..."
                  : isEditing
                  ? "Update Survey"
                  : "Create Survey"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters + Search */}
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
              placeholder="Search by name, surveyCode, project, audience, category"
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
              {SURVEY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Category filter */}
          <div className="min-w-[160px]">
            <label
              className="text-xs mb-1 block opacity-70"
              style={{ color: themeColors.text }}
            >
              Category
            </label>
            <div className="flex items-center gap-2">
              <FaFilter className="opacity-70" />
              <select
                className="w-full p-2 rounded-lg border text-sm"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                }}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="All">All</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <div
            key={i}
            className="p-6 rounded-xl border transition-all duration-300 hover:shadow-lg group"
            style={{
              backgroundColor: themeColors.surface,
              borderColor: themeColors.border,
            }}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p
                  className="text-sm font-medium mb-1 opacity-75"
                  style={{ color: themeColors.text }}
                >
                  {s.title}
                </p>
                <p
                  className="text-2xl font-bold mb-2"
                  style={{ color: themeColors.primary }}
                >
                  {s.value}
                </p>
                <p
                  className="text-xs opacity-60"
                  style={{ color: themeColors.text }}
                >
                  {s.description}
                </p>
              </div>
              <div
                className="p-3 rounded-xl group-hover:scale-110 transition-transform duration-300"
                style={{ backgroundColor: themeColors.primary + "15" }}
              >
                <s.icon
                  className="text-lg"
                  style={{ color: themeColors.primary }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Surveys table */}
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
                  "Name",
                  "Survey Code",
                  "Status",
                  "Category",
                  "Project",
                  "Audience",
                  "Start",
                  "End",
                  "Created",
                  "Actions",
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
              {filteredSurveys.map((s) => (
                <tr key={s._id || s.surveyCode}>
                  <td className="px-4 py-3">
                    <div
                      className="font-medium"
                      style={{ color: themeColors.text }}
                    >
                      {s.name}
                    </div>
                    {s.description && (
                      <div
                        className="text-xs opacity-70 line-clamp-1"
                        style={{ color: themeColors.text }}
                      >
                        {s.description}
                      </div>
                    )}
                  </td>
                  <td
                    className="px-4 py-3 text-xs"
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
                    className="px-4 py-3 text-xs"
                    style={{ color: themeColors.text }}
                  >
                    {s.targetAudience || "-"}
                  </td>
                  <td
                    className="px-4 py-3 text-xs"
                    style={{ color: themeColors.text }}
                  >
                    {fmtDate(s.startDate)}
                  </td>
                  <td
                    className="px-4 py-3 text-xs"
                    style={{ color: themeColors.text }}
                  >
                    {fmtDate(s.endDate)}
                  </td>
                  <td
                    className="px-4 py-3 text-xs"
                    style={{ color: themeColors.text }}
                  >
                    {fmtDate(s.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/surveys/${s._id || s.surveyCode}/questions`}
                        className="px-3 py-1.5 rounded-lg border text-xs font-semibold"
                        style={{
                          borderColor: themeColors.primary,
                          color: themeColors.primary,
                        }}
                      >
                        Manage Questions
                      </Link>
                      <button
                        type="button"
                        onClick={() => startEditSurvey(s)}
                        className="px-2.5 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1"
                        style={{
                          borderColor: themeColors.border,
                          color: themeColors.text,
                          backgroundColor: themeColors.surface,
                        }}
                      >
                        <FaEdit />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSurvey(s)}
                        className="px-2.5 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1"
                        style={{
                          borderColor: themeColors.danger,
                          color: themeColors.danger,
                          backgroundColor: themeColors.surface,
                        }}
                      >
                        <FaTrash />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSurveys.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-8 text-center text-sm"
                    style={{ color: themeColors.text }}
                  >
                    No surveys found for current filters.
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

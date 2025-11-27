// src/pages/SurveyQuestions.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  FaArrowLeft,
  FaPlus,
  FaListOl,
  FaStar,
  FaToggleOn,
  FaToggleOff,
  FaQuestionCircle,
  FaCheckCircle,
  FaInfoCircle,
  FaListUl,
  FaTrash,
  FaEdit,
} from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import {
  getSurveyWithQuestions,
  addSurveyQuestion,
  updateSurveyQuestion,
  deleteSurveyQuestion,
} from "../apis/surveys";

const QUESTION_TYPES = [
  { value: "OPEN_ENDED", label: "Open Ended", sub: "Long / short text answer" },
  { value: "MCQ_SINGLE", label: "MCQ", sub: "Single or multi-select" },
  { value: "CHECKBOX", label: "Checkbox", sub: "Multiple selections" },
  { value: "DROPDOWN", label: "Dropdown", sub: "Select one from list" },
  { value: "LIKERT", label: "Likert Scale", sub: "Agreement scale" },
  { value: "RATING", label: "Rating", sub: "Stars / numeric rating" },
  { value: "YES_NO", label: "Yes / No", sub: "Binary choice" },
];

export default function SurveyQuestions() {
  const { themeColors } = useTheme();
  const { surveyIdOrCode } = useParams();

  const [loading, setLoading] = useState(true);
  const [survey, setSurvey] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState("");

  // create / edit question
  const [creating, setCreating] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const isEditing = !!editingQuestionId;

  const [newQuestion, setNewQuestion] = useState({
    questionText: "",
    type: "OPEN_ENDED",
    options: [], // array of option strings
    allowMultiple: false,
    minRating: 1,
    maxRating: 5,
    ratingStep: 1,
    required: true,
    order: "",
    helpText: "",
    // ⭐ Other option controls
    enableOtherOption: false,
    otherOptionLabel: "Other",
    // ⭐ Follow-up controls
    parentQuestionId: null,
    parentOptionValue: "",
  });

  const needsOptions = useMemo(
    () =>
      ["MCQ_SINGLE", "CHECKBOX", "DROPDOWN", "LIKERT", "YES_NO"].includes(
        newQuestion.type
      ),
    [newQuestion.type]
  );

  const isRatingType = useMemo(
    () => newQuestion.type === "RATING",
    [newQuestion.type]
  );

  const isFollowUpMode = !!newQuestion.parentQuestionId;

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getSurveyWithQuestions(surveyIdOrCode);
      setSurvey(res.survey || null);
      setQuestions(res.questions || []);
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to load survey.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyIdOrCode]);

  const resetQuestionForm = () => {
    setEditingQuestionId(null);
    setNewQuestion({
      questionText: "",
      type: "OPEN_ENDED",
      options: [],
      allowMultiple: false,
      minRating: 1,
      maxRating: 5,
      ratingStep: 1,
      required: true,
      order: "",
      helpText: "",
      enableOtherOption: false,
      otherOptionLabel: "Other",
      parentQuestionId: null,
      parentOptionValue: "",
    });
  };

  const handleQChange = (field, value) => {
    // Follow-up mode me type change allowed nahi (hamesha OPEN_ENDED)
    if (isFollowUpMode && field === "type") {
      return;
    }

    // Question type change pe defaults set karo (sirf root ke liye)
    if (field === "type") {
      setNewQuestion((prev) => {
        const next = { ...prev, type: value };

        if (value === "YES_NO") {
          next.options = ["Yes", "No"];
        } else if (value === "LIKERT") {
          next.options = [
            "Strongly Disagree",
            "Disagree",
            "Neutral",
            "Agree",
            "Strongly Agree",
          ];
        } else if (value === "OPEN_ENDED" || value === "RATING") {
          next.options = [];
        } else if (
          ["MCQ_SINGLE", "CHECKBOX", "DROPDOWN"].includes(value) &&
          (!prev.options || prev.options.length === 0)
        ) {
          // empty se start
          next.options = [];
        }

        if (value === "RATING") {
          next.minRating = 1;
          next.maxRating = 5;
          next.ratingStep = 1;
        }

        // Agar non-option type pe ja rahe ho to Other disable
        if (
          !["MCQ_SINGLE", "CHECKBOX", "DROPDOWN", "LIKERT", "YES_NO"].includes(
            value
          )
        ) {
          next.enableOtherOption = false;
          next.otherOptionLabel = "Other";
        }

        return next;
      });
      return;
    }

    setNewQuestion((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestion.questionText.trim()) {
      toast.error("Question text is required.");
      return;
    }

    const isFollowUp = !!newQuestion.parentQuestionId;

    try {
      setCreating(true);

      const payload = {
        questionText: newQuestion.questionText.trim(),
        required: newQuestion.required,
        order: newQuestion.order ? Number(newQuestion.order) : 0,
        helpText: newQuestion.helpText || undefined,
      };

      if (isFollowUp) {
        // 🔵 Follow-up hamesha OPEN_ENDED + parent info
        payload.type = "OPEN_ENDED";
        payload.parentQuestionId = newQuestion.parentQuestionId;
        payload.parentOptionValue = newQuestion.parentOptionValue;
      } else {
        // Root question
        payload.type = newQuestion.type;

        // options wali types
        if (needsOptions) {
          const opts = (newQuestion.options || [])
            .map((o) => o.trim())
            .filter(Boolean);
          if (!opts.length) {
            toast.error("Please add at least one option.");
            setCreating(false);
            return;
          }
          payload.options = opts;

          // ⭐ Other option controls
          payload.enableOtherOption = !!newQuestion.enableOtherOption;
          if (newQuestion.enableOtherOption) {
            payload.otherOptionLabel =
              newQuestion.otherOptionLabel?.trim() || "Other";
          }
        }

        // checkbox / mcq
        if (newQuestion.type === "CHECKBOX") {
          payload.allowMultiple = true;
        } else if (newQuestion.type === "MCQ_SINGLE") {
          payload.allowMultiple = !!newQuestion.allowMultiple;
        }

        // rating config
        if (isRatingType) {
          const min = Number(newQuestion.minRating) || 1;
          const max = Number(newQuestion.maxRating) || 5;
          const step = Number(newQuestion.ratingStep) || 1;

          if (max <= min) {
            toast.error("Max rating should be greater than min rating.");
            setCreating(false);
            return;
          }
          if (step <= 0) {
            toast.error("Step should be greater than 0.");
            setCreating(false);
            return;
          }

          payload.minRating = min;
          payload.maxRating = max;
          payload.ratingStep = step;
        }
      }

      if (!isEditing) {
        // CREATE
        const res = await addSurveyQuestion(surveyIdOrCode, payload);
        const q = res?.question;
        if (q) {
          setQuestions((prev) =>
            [...prev, q].sort((a, b) => (a.order || 0) - (b.order || 0))
          );
        }

        toast.success(
          res?.message ||
            (isFollowUp
              ? "Follow-up question added successfully"
              : "Question added successfully")
        );

        if (isFollowUp) {
          // Follow-up mode: parent same rakho, sirf text reset
          setNewQuestion((prev) => ({
            ...prev,
            questionText: "",
            helpText: "",
            order: "",
            required: true,
          }));
        } else {
          // Root question: previous type ke hisaab se reset
          setNewQuestion((prev) => {
            let nextOptions = [];
            if (prev.type === "YES_NO") {
              nextOptions = ["Yes", "No"];
            } else if (prev.type === "LIKERT") {
              nextOptions = [
                "Strongly Disagree",
                "Disagree",
                "Neutral",
                "Agree",
                "Strongly Agree",
              ];
            }

            return {
              questionText: "",
              type: prev.type,
              options: nextOptions,
              allowMultiple: false,
              minRating: prev.type === "RATING" ? prev.minRating : 1,
              maxRating: prev.type === "RATING" ? prev.maxRating : 5,
              ratingStep: prev.type === "RATING" ? prev.ratingStep : 1,
              required: true,
              order: "",
              helpText: "",
              enableOtherOption: false,
              otherOptionLabel: "Other",
              parentQuestionId: null,
              parentOptionValue: "",
            };
          });
        }
      } else {
        // UPDATE
        const res = await updateSurveyQuestion(editingQuestionId, payload);
        const updated = res?.question;
        if (updated) {
          setQuestions((prev) =>
            prev.map((q) =>
              (q._id || q.id) === (updated._id || updated.id) ? updated : q
            )
          );
        }
        toast.success(
          res?.message ||
            (isFollowUp ? "Follow-up updated successfully" : "Question updated successfully")
        );
        resetQuestionForm();
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        (isEditing
          ? "Failed to update question."
          : isFollowUp
          ? "Failed to add follow-up."
          : "Failed to add question.");
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const startEditQuestion = (q) => {
    const id = q._id || q.id;
    setEditingQuestionId(id);

    const needsOpts = ["MCQ_SINGLE", "CHECKBOX", "DROPDOWN", "LIKERT", "YES_NO"];

    setNewQuestion({
      questionText: q.questionText || "",
      type: q.type || "OPEN_ENDED",
      options:
        needsOpts.includes(q.type) && q.options && q.options.length
          ? q.options
          : [],
      allowMultiple: !!q.allowMultiple,
      minRating: q.type === "RATING" ? q.minRating ?? 1 : 1,
      maxRating: q.type === "RATING" ? q.maxRating ?? 5 : 5,
      ratingStep: q.type === "RATING" ? q.ratingStep ?? 1 : 1,
      required: q.required ?? true,
      order: typeof q.order === "number" ? q.order : "",
      helpText: q.helpText || "",
      enableOtherOption: !!q.enableOtherOption,
      otherOptionLabel: q.otherOptionLabel || "Other",
      parentQuestionId: q.parentQuestion || null,
      parentOptionValue: q.parentOptionValue || "",
    });

    // form tak scroll
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteQuestion = async (q) => {
    const id = q._id || q.id;
    const label =
      (q.questionText && q.questionText.slice(0, 60)) || "this question";

    const ok = window.confirm(
      `Are you sure you want to delete "${label}"? This cannot be undone.`
    );
    if (!ok) return;

    try {
      const res = await deleteSurveyQuestion(id);
      setQuestions((prev) => prev.filter((qq) => (qq._id || qq.id) !== id));
      if (editingQuestionId === id) {
        resetQuestionForm();
      }
      toast.success(res?.message || "Question deleted successfully");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to delete question.";
      toast.error(msg);
    }
  };

  const startAddFollowUp = (parentQuestion, optionValue) => {
    const parentId = parentQuestion._id || parentQuestion.id;
    setEditingQuestionId(null);
    setNewQuestion({
      questionText: "",
      type: "OPEN_ENDED",
      options: [],
      allowMultiple: false,
      minRating: 1,
      maxRating: 5,
      ratingStep: 1,
      required: true,
      order: "",
      helpText: "",
      enableOtherOption: false,
      otherOptionLabel: "Other",
      parentQuestionId: parentId,
      parentOptionValue: optionValue,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ---- derived data for nested view ----
  const rootQuestions = useMemo(
    () => (questions || []).filter((q) => !q.parentQuestion),
    [questions]
  );

  const followUpsByParent = useMemo(() => {
    const map = {};
    (questions || []).forEach((q) => {
      if (q.parentQuestion) {
        const key = `${q.parentQuestion}::${q.parentOptionValue || ""}`;
        if (!map[key]) map[key] = [];
        map[key].push(q);
      }
    });

    // sort follow-ups inside each bucket
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => {
        const ao = a.order || 0;
        const bo = b.order || 0;
        if (ao !== bo) return ao - bo;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    });

    return map;
  }, [questions]);

  // ---- UI ----
  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4" style={{ color: themeColors.text }}>
            Loading survey...
          </p>
        </div>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="space-y-4">
        <Link
          to="/surveys"
          className="inline-flex items-center gap-2 text-sm"
          style={{ color: themeColors.primary }}
        >
          <FaArrowLeft />
          Back to Surveys
        </Link>
        <div
          className="p-4 rounded-lg border"
          style={{
            borderColor: themeColors.border,
            color: themeColors.danger,
            backgroundColor: themeColors.surface,
          }}
        >
          {error || "Survey not found"}
        </div>
      </div>
    );
  }

  const selectedTypeMeta = QUESTION_TYPES.find(
    (t) => t.value === newQuestion.type
  );

  const currentOptions =
    needsOptions && newQuestion.options
      ? newQuestion.options.map((o) => o.trim()).filter(Boolean)
      : [];

  const optionsText = (newQuestion.options || []).join("\n");

  const parentQuestionForForm = isFollowUpMode
    ? questions.find(
        (q) => (q._id || q.id) === newQuestion.parentQuestionId
      )
    : null;

  const formTitle = isEditing
    ? "Edit Question"
    : isFollowUpMode
    ? "Add Follow-up Question"
    : "Add Question";

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link
            to="/surveys"
            className="mt-1 inline-flex items-center justify-center w-8 h-8 rounded-full border"
            style={{
              borderColor: themeColors.border,
              color: themeColors.text,
              backgroundColor: themeColors.surface,
            }}
          >
            <FaArrowLeft />
          </Link>
          <div>
            <h1
              className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2"
              style={{ color: themeColors.text }}
            >
              <FaQuestionCircle />
              {survey.name}
            </h1>
            <p
              className="text-xs mt-1 opacity-75"
              style={{ color: themeColors.text }}
            >
              Survey Code:{" "}
              <span className="font-mono">{survey.surveyCode}</span>
            </p>
            {survey.description && (
              <p
                className="text-xs mt-1 opacity-75"
                style={{ color: themeColors.text }}
              >
                {survey.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-start md:items-end gap-1">
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={{
              backgroundColor:
                survey.status === "ACTIVE"
                  ? themeColors.success + "20"
                  : survey.status === "DRAFT"
                  ? themeColors.primary + "20"
                  : themeColors.danger + "20",
              color:
                survey.status === "ACTIVE"
                  ? themeColors.success
                  : survey.status === "DRAFT"
                  ? themeColors.primary
                  : themeColors.danger,
            }}
          >
            {survey.status}
          </span>
          <p
            className="text-[11px] opacity-70"
            style={{ color: themeColors.text }}
          >
            Category: {survey.category || "-"} · Project:{" "}
            {survey.projectName || "-"}
          </p>
        </div>
      </div>

      {/* Create / Edit Question Card */}
      <div
        className="rounded-xl border p-4 md:p-6 shadow-sm"
        style={{
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col gap-1">
            <h2
              className="text-lg font-semibold flex items-center gap-2"
              style={{ color: themeColors.text }}
            >
              <FaPlus />
              {formTitle}
            </h2>
            {isFollowUpMode && parentQuestionForForm && (
              <div className="inline-flex items-center gap-2 text-[11px]">
                <span
                  className="px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    backgroundColor: themeColors.primary + "20",
                    color: themeColors.primary,
                  }}
                >
                  Follow-up · Open Ended
                </span>
                <span style={{ color: themeColors.text }}>
                  For option{" "}
                  <strong>
                    &quot;{newQuestion.parentOptionValue}&quot;
                  </strong>{" "}
                  of question:{" "}
                  <span className="italic">
                    {parentQuestionForForm.questionText.slice(0, 60)}
                    {parentQuestionForForm.questionText.length > 60
                      ? "..."
                      : ""}
                  </span>
                </span>
              </div>
            )}
          </div>
          {!isFollowUpMode && selectedTypeMeta && (
            <div className="hidden md:flex flex-col items-end">
              <span
                className="text-xs font-semibold"
                style={{ color: themeColors.text }}
              >
                {selectedTypeMeta.label}
              </span>
              <span
                className="text-[11px] opacity-70"
                style={{ color: themeColors.text }}
              >
                {selectedTypeMeta.sub}
              </span>
            </div>
          )}
        </div>

        {/* FORM: grid for fields + buttons niche */}
        <form onSubmit={handleSubmitQuestion} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)] gap-5">
            {/* LEFT: Question core + type selection */}
            <div className="space-y-4">
              {/* Question Text */}
              <div>
                <label className="text-xs font-medium block mb-1">
                  Question Text *
                </label>
                <textarea
                  rows={3}
                  value={newQuestion.questionText}
                  onChange={(e) =>
                    handleQChange("questionText", e.target.value)
                  }
                  placeholder={
                    isFollowUpMode
                      ? "Type your follow-up question here..."
                      : "Type your question here..."
                  }
                  className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.background,
                    color: themeColors.text,
                  }}
                />
              </div>

              {/* Type Pills (sirf root ke liye) */}
              {!isFollowUpMode && (
                <div>
                  <label className="text-xs font-medium block mb-2">
                    Question Type *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {QUESTION_TYPES.map((t) => {
                      const selected = newQuestion.type === t.value;
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => handleQChange("type", t.value)}
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
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                  {selectedTypeMeta && (
                    <p
                      className="mt-1 text-[11px] flex items-center gap-1 opacity-75"
                      style={{ color: themeColors.text }}
                    >
                      <FaInfoCircle className="inline-block" />
                      {selectedTypeMeta.sub}
                    </p>
                  )}
                </div>
              )}

              {/* Order + Required */}
              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,auto)] gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1 flex items-center gap-1">
                    <FaListOl />
                    Order
                  </label>
                  <input
                    type="number"
                    value={newQuestion.order}
                    onChange={(e) => handleQChange("order", e.target.value)}
                    placeholder="0, 1, 2, ..."
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{
                      borderColor: themeColors.border,
                      backgroundColor: themeColors.background,
                      color: themeColors.text,
                    }}
                  />
                  <p
                    className="text-[11px] mt-1 opacity-70"
                    style={{ color: themeColors.text }}
                  >
                    Lower order will appear earlier. Default is 0.
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-5 sm:mt-7">
                  <span
                    className="text-xs font-medium"
                    style={{ color: themeColors.text }}
                  >
                    Required
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleQChange("required", !newQuestion.required)
                    }
                    className="p-2 rounded-lg border"
                    style={{
                      borderColor: themeColors.border,
                      color: newQuestion.required
                        ? themeColors.success
                        : themeColors.danger,
                    }}
                  >
                    {newQuestion.required ? <FaToggleOn /> : <FaToggleOff />}
                  </button>
                </div>
              </div>

              {/* Help text */}
              <div>
                <label className="text-xs font-medium block mb-1">
                  Help Text (optional)
                </label>
                <input
                  type="text"
                  value={newQuestion.helpText}
                  onChange={(e) =>
                    handleQChange("helpText", e.target.value)
                  }
                  placeholder="Extra guidance for the user..."
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.background,
                    color: themeColors.text,
                  }}
                />
              </div>
            </div>

            {/* RIGHT: Type-specific config / options UI (sirf root ke liye) */}
            <div className="space-y-4">
              {/* Options Panel */}
              {!isFollowUpMode && needsOptions && (
                <div
                  className="rounded-lg border p-3 md:p-4"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.background,
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FaListUl
                      className="text-sm"
                      style={{ color: themeColors.primary }}
                    />
                  </div>

                  <div>
                    <p
                      className="text-xs font-semibold"
                      style={{ color: themeColors.text }}
                    >
                      Options *
                    </p>
                    <p
                      className="text-[11px] opacity-70"
                      style={{ color: themeColors.text }}
                    >
                      Har line ek option hogi. Enter dabate jao, nayi line pe
                      naya option ban jayega.
                    </p>
                  </div>

                  {/* Single textarea for all options (one per line) */}
                  <textarea
                    rows={Math.max(3, (newQuestion.options || []).length || 3)}
                    value={optionsText}
                    onChange={(e) => {
                      const lines = e.target.value.split("\n");
                      setNewQuestion((prev) => ({
                        ...prev,
                        options: lines,
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-lg border text-xs"
                    placeholder={"Option 1\nOption 2\nOption 3"}
                    style={{
                      borderColor: themeColors.border,
                      backgroundColor: themeColors.surface,
                      color: themeColors.text,
                      whiteSpace: "pre-wrap",
                    }}
                  />

                  {/* Preset buttons for YES/NO & LIKERT */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {newQuestion.type === "YES_NO" && (
                      <button
                        type="button"
                        className="px-2.5 py-1 rounded-full border text-[11px] flex items-center gap-1"
                        style={{
                          borderColor: themeColors.primary,
                          color: themeColors.primary,
                          backgroundColor: themeColors.surface,
                        }}
                        onClick={() =>
                          setNewQuestion((prev) => ({
                            ...prev,
                            options: ["Yes", "No"],
                          }))
                        }
                      >
                        <FaCheckCircle />
                        Use Yes / No
                      </button>
                    )}
                    {newQuestion.type === "LIKERT" && (
                      <button
                        type="button"
                        className="px-2.5 py-1 rounded-full border text-[11px] flex items-center gap-1"
                        style={{
                          borderColor: themeColors.primary,
                          color: themeColors.primary,
                          backgroundColor: themeColors.surface,
                        }}
                        onClick={() =>
                          setNewQuestion((prev) => ({
                            ...prev,
                            options: [
                              "Strongly Disagree",
                              "Disagree",
                              "Neutral",
                              "Agree",
                              "Strongly Agree",
                            ],
                          }))
                        }
                      >
                        <FaCheckCircle />
                        5-point Likert preset
                      </button>
                    )}
                  </div>

                  {/* ⭐ Enable Other option */}
                  <div
                    className="mt-3 rounded-lg border p-3 flex flex-col gap-2"
                    style={{
                      borderColor: themeColors.border,
                      backgroundColor: themeColors.surface,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p
                          className="text-xs font-semibold"
                          style={{ color: themeColors.text }}
                        >
                          Enable "Other" option
                        </p>
                        <p
                          className="text-[11px] opacity-70"
                          style={{ color: themeColors.text }}
                        >
                          Agar enable hua, to user ek separate Other option
                          choose karega aur uska answer text me likh sakta hai.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleQChange(
                            "enableOtherOption",
                            !newQuestion.enableOtherOption
                          )
                        }
                        className="p-2 rounded-lg border"
                        style={{
                          borderColor: themeColors.border,
                          color: newQuestion.enableOtherOption
                            ? themeColors.success
                            : themeColors.text,
                        }}
                      >
                        {newQuestion.enableOtherOption ? (
                          <FaToggleOn />
                        ) : (
                          <FaToggleOff />
                        )}
                      </button>
                    </div>

                    <div className="mt-2">
                      <label className="text-[11px] font-medium block mb-1">
                        Other option label
                      </label>
                      <input
                        type="text"
                        disabled={!newQuestion.enableOtherOption}
                        value={newQuestion.otherOptionLabel}
                        onChange={(e) =>
                          handleQChange("otherOptionLabel", e.target.value)
                        }
                        placeholder="Other (please specify)"
                        className="w-full px-3 py-1.5 rounded-lg border text-xs"
                        style={{
                          borderColor: themeColors.border,
                          backgroundColor: newQuestion.enableOtherOption
                            ? themeColors.background
                            : themeColors.surface,
                          color: themeColors.text,
                          opacity: newQuestion.enableOtherOption ? 1 : 0.6,
                        }}
                      />
                    </div>
                  </div>

                  {/* Small preview */}
                  {currentOptions.length > 0 && (
                    <div className="mt-3">
                      <p
                        className="text-[11px] font-semibold mb-1"
                        style={{ color: themeColors.text }}
                      >
                        Preview (ye options user ko dikhengi):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {currentOptions.map((opt, idx) => (
                          <span
                            key={`${opt}-${idx}`}
                            className="inline-flex items-center px-2.5 py-1 rounded-full border text-[11px]"
                            style={{
                              borderColor: themeColors.border,
                              backgroundColor: themeColors.surface,
                              color: themeColors.text,
                            }}
                          >
                            <span className="mr-1 opacity-70">
                              {idx + 1}.
                            </span>
                            {opt}
                          </span>
                        ))}

                        {newQuestion.enableOtherOption && (
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] italic"
                            style={{
                              borderColor: themeColors.primary,
                              backgroundColor: themeColors.surface,
                              color: themeColors.primary,
                            }}
                          >
                            {newQuestion.otherOptionLabel || "Other"} (free text)
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Allow multiple (MCQ_SINGLE only, root) */}
              {!isFollowUpMode && newQuestion.type === "MCQ_SINGLE" && (
                <div
                  className="rounded-lg border p-3 flex items-center justify-between gap-3"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.background,
                  }}
                >
                  <div>
                    <p
                      className="text-xs font-semibold"
                      style={{ color: themeColors.text }}
                    >
                      Allow multiple selection
                    </p>
                    <p
                      className="text-[11px] opacity-70"
                      style={{ color: themeColors.text }}
                    >
                      Agar on hua to user ek se zyada options select kar sakta
                      hai.
                    </p>
                  </div>
                  <input
                    id="allowMultiple"
                    type="checkbox"
                    checked={newQuestion.allowMultiple}
                    onChange={(e) =>
                      handleQChange("allowMultiple", e.target.checked)
                    }
                    className="w-4 h-4"
                  />
                </div>
              )}

              {/* Rating config (root only) */}
              {!isFollowUpMode && isRatingType && (
                <div
                  className="rounded-lg border p-3 md:p-4 space-y-3"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.background,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <FaStar
                      className="text-sm"
                      style={{ color: themeColors.primary }}
                    />
                    <div>
                      <p
                        className="text-xs font-semibold"
                        style={{ color: themeColors.text }}
                      >
                        Rating Configuration
                      </p>
                      <p
                        className="text-[11px] opacity-70"
                        style={{ color: themeColors.text }}
                      >
                        Define minimum, maximum and step for rating scale.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-medium block mb-1">
                        Min
                      </label>
                      <input
                        type="number"
                        value={newQuestion.minRating}
                        onChange={(e) =>
                          handleQChange("minRating", e.target.value)
                        }
                        className="w-full px-2 py-1.5 rounded-lg border text-xs"
                        style={{
                          borderColor: themeColors.border,
                          backgroundColor: themeColors.surface,
                          color: themeColors.text,
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium block mb-1">
                        Max
                      </label>
                      <input
                        type="number"
                        value={newQuestion.maxRating}
                        onChange={(e) =>
                          handleQChange("maxRating", e.target.value)
                        }
                        className="w-full px-2 py-1.5 rounded-lg border text-xs"
                        style={{
                          borderColor: themeColors.border,
                          backgroundColor: themeColors.surface,
                          color: themeColors.text,
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium block mb-1">
                        Step
                      </label>
                      <input
                        type="number"
                        value={newQuestion.ratingStep}
                        onChange={(e) =>
                          handleQChange("ratingStep", e.target.value)
                        }
                        className="w-full px-2 py-1.5 rounded-lg border text-xs"
                        style={{
                          borderColor: themeColors.border,
                          backgroundColor: themeColors.surface,
                          color: themeColors.text,
                        }}
                      />
                    </div>
                  </div>

                  <p
                    className="text-[11px] opacity-75"
                    style={{ color: themeColors.text }}
                  >
                    Preview: {newQuestion.minRating} to {newQuestion.maxRating}{" "}
                    (step {newQuestion.ratingStep})
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ✅ Buttons */}
          <div className="pt-2 flex justify-end gap-2">
            {(isEditing || isFollowUpMode) && (
              <button
                type="button"
                onClick={resetQuestionForm}
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
              disabled={creating}
              className="px-4 py-2 rounded-lg text-sm font-semibold shadow-sm"
              style={{
                backgroundColor: themeColors.primary,
                color: themeColors.onPrimary,
                opacity: creating ? 0.7 : 1,
              }}
            >
              {creating
                ? isEditing
                  ? "Updating..."
                  : isFollowUpMode
                  ? "Adding follow-up..."
                  : "Adding..."
                : isEditing
                ? "Update Question"
                : isFollowUpMode
                ? "Add Follow-up"
                : "Add Question"}
            </button>
          </div>
        </form>
      </div>

      {/* Questions List */}
      <div
        className="rounded-2xl border shadow-sm p-4 md:p-5"
        style={{
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
        }}
      >
        <h2
          className="text-lg font-semibold mb-4 flex items-center gap-2"
          style={{ color: themeColors.text }}
        >
          Existing Questions ({questions.length})
        </h2>
        {rootQuestions.length === 0 ? (
          <p
            className="text-sm opacity-75"
            style={{ color: themeColors.text }}
          >
            No questions added yet. Start by adding your first question.
          </p>
        ) : (
          <div className="space-y-3">
            {rootQuestions
              .slice()
              .sort((a, b) => (a.order || 0) - (b.order || 0))
              .map((q, index) => {
                const optionBased = q.options && q.options.length > 0;
                const parentId = q._id || q.id;

                return (
                  <div
                    key={parentId}
                    className="rounded-xl border p-3 md:p-4 flex flex-col gap-2"
                    style={{
                      borderColor: themeColors.border,
                      backgroundColor: themeColors.surface,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div
                          className="text-xs font-semibold opacity-70"
                          style={{ color: themeColors.text }}
                        >
                          Q{index + 1} · {q.type}
                        </div>
                        <div
                          className="text-sm font-medium"
                          style={{ color: themeColors.text }}
                        >
                          {q.questionText}
                        </div>
                        {q.helpText && (
                          <div
                            className="text-xs opacity-70 mt-1"
                            style={{ color: themeColors.text }}
                          >
                            {q.helpText}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                          style={{
                            backgroundColor: q.required
                              ? themeColors.success + "20"
                              : themeColors.border,
                            color: q.required
                              ? themeColors.success
                              : themeColors.text,
                          }}
                        >
                          {q.required ? "Required" : "Optional"}
                        </span>
                        {typeof q.order === "number" && (
                          <span
                            className="text-[11px] opacity-70"
                            style={{ color: themeColors.text }}
                          >
                            Order: {q.order}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Options / rating details + nested follow-ups */}
                    {(optionBased || q.type === "RATING") && (
                      <div
                        className="mt-2 pt-2 border-t text-xs"
                        style={{ borderColor: themeColors.border }}
                      >
                        {optionBased && (
                          <div className="mb-2">
                            <span className="font-semibold block mb-1">
                              Options & Follow-ups:
                            </span>
                            <ol className="space-y-2 pl-1">
                              {(q.options || []).map((opt, idx) => {
                                const key = `${parentId}::${opt}`;
                                const followUps = followUpsByParent[key] || [];
                                return (
                                  <li
                                    key={`${opt}-${idx}`}
                                    className="flex flex-col gap-1"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-start gap-1">
                                        <span
                                          className="font-mono text-[11px] mt-[2px]"
                                          style={{ color: themeColors.text }}
                                        >
                                          {idx + 1}.
                                        </span>
                                        <span
                                          className="text-xs"
                                          style={{ color: themeColors.text }}
                                        >
                                          {opt}
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          startAddFollowUp(q, opt)
                                        }
                                        className="px-2 py-1 rounded-full border text-[10px] font-semibold"
                                        style={{
                                          borderColor: themeColors.primary,
                                          color: themeColors.primary,
                                          backgroundColor:
                                            themeColors.surface,
                                        }}
                                      >
                                        + Follow-up
                                      </button>
                                    </div>

                                    {/* Nested follow-up questions */}
                                    {followUps.length > 0 && (
                                      <div className="ml-5 mt-1 space-y-1">
                                        {followUps.map((fu) => (
                                          <div
                                            key={fu._id || fu.id}
                                            className="flex items-start justify-between gap-2 rounded-lg px-2 py-1"
                                            style={{
                                              backgroundColor:
                                                themeColors.background,
                                            }}
                                          >
                                            <div>
                                              <span
                                                className="text-[11px] font-semibold mr-1"
                                                style={{
                                                  color: themeColors.text,
                                                }}
                                              >
                                                ↳
                                              </span>
                                              <span
                                                className="text-[11px]"
                                                style={{
                                                  color: themeColors.text,
                                                }}
                                              >
                                                {fu.questionText}
                                              </span>
                                              {fu.helpText && (
                                                <div
                                                  className="text-[10px] opacity-70"
                                                  style={{
                                                    color: themeColors.text,
                                                  }}
                                                >
                                                  {fu.helpText}
                                                </div>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  startEditQuestion(fu)
                                                }
                                                className="px-2 py-0.5 rounded-lg border text-[10px] inline-flex items-center gap-1"
                                                style={{
                                                  borderColor:
                                                    themeColors.border,
                                                  color: themeColors.text,
                                                  backgroundColor:
                                                    themeColors.surface,
                                                }}
                                              >
                                                <FaEdit />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleDeleteQuestion(fu)
                                                }
                                                className="px-2 py-0.5 rounded-lg border text-[10px] inline-flex items-center gap-1"
                                                style={{
                                                  borderColor:
                                                    themeColors.danger,
                                                  color: themeColors.danger,
                                                  backgroundColor:
                                                    themeColors.surface,
                                                }}
                                              >
                                                <FaTrash />
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </li>
                                );
                              })}

                              {q.enableOtherOption && (
                                <li className="flex flex-col gap-1 italic">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-1">
                                      <span
                                        className="font-mono text-[11px] mt-[2px]"
                                        style={{ color: themeColors.text }}
                                      >
                                        {(q.options?.length || 0) + 1}.
                                      </span>
                                      <span
                                        className="text-xs"
                                        style={{
                                          color: themeColors.primary,
                                        }}
                                      >
                                        {q.otherOptionLabel || "Other"} (free
                                        text)
                                      </span>
                                    </div>
                                    {/* Other ke follow-ups bhi possible hai, but yahan parentOptionValue exactly label hona chahiye */}
                                  </div>
                                </li>
                              )}
                            </ol>
                          </div>
                        )}
                        {q.type === "RATING" && (
                          <div>
                            <span className="font-semibold">Rating:</span>{" "}
                            {q.minRating} to {q.maxRating} (step{" "}
                            {q.ratingStep})
                          </div>
                        )}
                        {["MCQ_SINGLE", "CHECKBOX"].includes(q.type) && (
                          <div>
                            <span className="font-semibold">Multiple:</span>{" "}
                            {q.allowMultiple ? "Yes" : "No"}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Root actions */}
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => startEditQuestion(q)}
                        className="px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1"
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
                        onClick={() => handleDeleteQuestion(q)}
                        className="px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1"
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
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

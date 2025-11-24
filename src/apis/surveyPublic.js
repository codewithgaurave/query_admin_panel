// src/apis/surveyPublic.js
import http from "./http";

/**
 * GET /survey/public/responses/all
 * Sabhi surveys + unke saare responses + user + approval info
 */
export const listAllPublicSurveyResponses = async () => {
  const { data } = await http.get("/survey/public/responses/all");
  return data; // { surveys: [...] }
};

/**
 * PATCH /survey/public/responses/:responseId/approval
 * body: { approvalStatus: string }
 *
 * approvalStatus options:
 * - "PENDING"
 * - "CORRECTLY_DONE"
 * - "NOT_ASKING_ALL_QUESTIONS"
 * - "NOT_DOING_IT_PROPERLY"
 * - "TAKING_FROM_FRIENDS_OR_TEAMMATE"
 * - "FAKE_OR_EMPTY_AUDIO"
 */
export const setSurveyResponseApproval = async (
  responseId,
  approvalStatus
) => {
  const { data } = await http.patch(
    `/survey/public/responses/${responseId}/approval`,
    { approvalStatus }
  );
  return data; // { message, response }
};

// ⭐ new
export const pinQuestionToDashboard = async ({ surveyId, questionId }) => {
  const { data } = await http.post("/survey/public/dashboard/pin", {
    surveyId,
    questionId,
  });
  return data;
};

// (optional) dashboard ke liye get pinned questions
export const getDashboardPinnedQuestions = async () => {
  const { data } = await http.get("/survey/public/dashboard/pins");
  return data;
};

// ⭐ NEW: delete/unpin pinned question
export const deleteDashboardPinnedQuestion = async (pinId) => {
  const { data } = await http.delete(
    `/survey/public/dashboard/pins/${pinId}`
  );
  return data; // { message, pin }
};
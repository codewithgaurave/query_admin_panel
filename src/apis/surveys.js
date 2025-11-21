// src/apis/surveys.js
import http from "./http";
import { getAdminToken } from "../utils/auth";

// helper: admin auth header
const authHeaders = () => {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const createSurvey = async (payload) => {
  const { data } = await http.post("/survey/create", payload, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
  });
  return data;
};

export const updateSurvey = async (surveyIdOrCode, payload) => {
  const { data } = await http.put(`/survey/${surveyIdOrCode}`, payload, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
  });
  return data;
};

/**
 * DELETE /survey/:surveyIdOrCode
 * Admin deletes a survey
 */
export const deleteSurvey = async (surveyIdOrCode) => {
  const { data } = await http.delete(`/survey/${surveyIdOrCode}`, {
    headers: authHeaders(),
  });
  // backend: { message }
  return data;
};

/**
 * GET /survey/list
 * Admin: list all surveys
 * backend: survey me ab assignedUsers bhi aayega (populate)
 */
export const listSurveys = async () => {
  const { data } = await http.get("/survey/list", {
    headers: authHeaders(),
  });
  // backend: { surveys }
  return data;
};

/**
 * GET /survey/:surveyIdOrCode
 * Get survey + questions (admin / public)
 * (Admin side pe hum usually sirf surveyId use karenge)
 */
export const getSurveyWithQuestions = async (surveyIdOrCode) => {
  const { data } = await http.get(`/survey/${surveyIdOrCode}`, {
    headers: authHeaders(), // admin side se bhi chalega
  });
  // backend: { survey, questions }
  return data;
};

/**
 * POST /survey/:surveyIdOrCode/questions
 * Admin: add a question
 */
export const addSurveyQuestion = async (surveyIdOrCode, payload) => {
  const { data } = await http.post(
    `/survey/${surveyIdOrCode}/questions`,
    payload,
    {
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
    }
  );
  // backend: { message, question }
  return data;
};

/**
 * PUT /survey/questions/:questionId
 * Admin: update a question
 */
export const updateSurveyQuestion = async (questionId, payload) => {
  const { data } = await http.put(`/survey/questions/${questionId}`, payload, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
  });
  // backend: { message, question }
  return data;
};

/**
 * DELETE /survey/questions/:questionId
 * Admin: delete a question
 */
export const deleteSurveyQuestion = async (questionId) => {
  const { data } = await http.delete(`/survey/questions/${questionId}`, {
    headers: authHeaders(),
  });
  // backend: { message }
  return data;
};

/**
 * GET /survey/public/list
 * Public / SURVEY_USER app:
 *  - by default ACTIVE + isActive true
 *  - optional ?userCode=USR-XXXX => sirf usko assigned (ya global) surveys
 */
export const listPublicSurveys = async (params = {}) => {
  const { data } = await http.get("/survey/public/list", {
    params,
  });
  // backend: { surveys }
  return data;
};

/**
 * GET /survey/responses/summary
 * Admin: sabhi surveys + kitne responses + kis user ne diye
 */
export const listSurveyResponseSummary = async () => {
  const { data } = await http.get("/survey/responses/summary", {
    headers: authHeaders(),
  });
  // backend: { surveys: [{ surveyId, surveyCode, name, totalResponses, users[], ... }] }
  return data;
};

/**
 * GET /survey/responses/user/:userCode
 * Admin: given user ne kin surveys pe kya answers diye
 */
export const getUserSurveySummary = async (userCode) => {
  const { data } = await http.get(`/survey/responses/user/${userCode}`, {
    headers: authHeaders(), // optional, lekin admin side se theek hai
  });
  // backend: { user, surveys: [...] }
  return data;
};

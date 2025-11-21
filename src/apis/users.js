// src/apis/users.js
import http from "./http";
import { getAdminToken } from "../utils/auth";

// helper: admin auth header
const authHeaders = () => {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * GET /user/list (mounted as /api/user/list)
 * optional params: { role?: "SURVEY_USER"|"QUALITY_ENGINEER", isActive?: "true"|"false" }
 */
export const listUsers = async (params = {}) => {
  const { data } = await http.get("/user/list", {
    params,
    headers: authHeaders(),
  });
  // backend returns { users }
  return data;
};

/**
 * POST /user/create
 * body: multipart/form-data
 * fields:
 *  - mobile (string, required)
 *  - password (string, required)
 *  - role ("SURVEY_USER" | "QUALITY_ENGINEER", required)
 *  - fullName (string, required)
 *  - email, employeeCode, department, city, state, pincode, dateOfJoining (optional)
 *  - profilePhoto (file)  // from <input type="file">
 */
export const createUser = async (payload) => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, value);
    }
  });

  const { data } = await http.post("/user/create", formData, {
    headers: {
      ...authHeaders(),
      "Content-Type": "multipart/form-data",
    },
  });
  // backend: { message, user }
  return data;
};

/**
 * PATCH /user/:id
 * body: { fullName?, email?, employeeCode?, department?, city?, state?, pincode?, dateOfJoining?, isActive?, role?, mobile? }
 */
export const updateUser = async (id, payload) => {
  const { data } = await http.patch(`/user/${id}`, payload, {
    headers: authHeaders(),
  });
  // backend: { message, user }
  return data;
};

export const blockUser = async (id) => {
  const { data } = await http.patch(
    `/user/${id}/block`,
    {}, // safer to send empty object
    {
      headers: authHeaders(),
    }
  );
  return data; // { message, user }
};

export const unblockUser = async (id) => {
  const { data } = await http.patch(
    `/user/${id}/unblock`,
    {}, // empty object
    {
      headers: authHeaders(),
    }
  );
  return data;
};

/**
 * 🔐 PATCH /user/:id/reset-password
 * body: { password: string }
 */
export const resetUserPassword = async (id, password) => {
  const { data } = await http.patch(
    `/user/${id}/reset-password`,
    { password },
    {
      headers: authHeaders(),
    }
  );
  // backend: { message, user }
  return data;
};

/**
 * DELETE /user/:id
 */
export const deleteUser = async (id) => {
  const { data } = await http.delete(`/user/${id}`, {
    headers: authHeaders(),
  });
  // backend: { message }
  return data;
};

/**
 * GET /user/:id
 * (agar kabhi detail view ke liye chahiye)
 */
export const getUserById = async (id) => {
  const { data } = await http.get(`/user/${id}`, {
    headers: authHeaders(),
  });
  // backend: { user }
  return data;
};

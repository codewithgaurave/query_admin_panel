// src/apis/punchins.js
import http from "./http";
import { getAdminToken } from "../utils/auth";

// helper: admin auth header
const authHeaders = () => {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * GET /punchin/all
 * (mounted as /api/punchin/all)
 * Admin-only endpoint – returns: { punches: [...] }
 */
export const getAllPunchHistory = async () => {
  const { data } = await http.get("/punchin/all", {
    headers: authHeaders(),
  });
  // backend: { punches }
  return data;
};

/**
 * GET /punchin/user/:userCode
 * (mounted as /api/punchin/user/:userCode)
 * Public endpoint – admin panel me bhi use kar sakte ho.
 */
export const getUserPunchHistory = async (userCode) => {
  const { data } = await http.get(`/punchin/user/${userCode}`, {
    headers: authHeaders(), // bhejna optional hai, but fine
  });
  // backend: { punches }
  return data;
};

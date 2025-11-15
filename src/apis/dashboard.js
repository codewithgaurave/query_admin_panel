// src/apis/dashboard.js
import http from "./http";
import { getAdminToken } from "../utils/auth";

/**
 * GET /admin/dashboard/overview
 * @param {Object} params { range?: "7d"|"30d"|"90d"|"180d" }
 */
export const getAdminDashboard = async (params = {}) => {
  const token = getAdminToken();
  const { data } = await http.get("/admin/dashboard/overview", {
    params: {
      tzOffsetMinutes: new Date().getTimezoneOffset() * -1, // (optional) agar future me chahiye
      ...params,
    },
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return data;
};

// src/apis/purchases.js
import http from "./http";
import { getAdminToken } from "../utils/auth";

/**
 * GET /subscriptions/admin/purchases
 * Optional query: { page, limit, status, userType, userId, planId, q }
 */
export const listPurchasesAdmin = async (params = {}) => {
  const token = getAdminToken();
  const { data } = await http.get("/subscriptions/admin/purchases", {
    params,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return data; // { success, page, totalPages, purchases: [...] }
};

// src/apis/plans.js
import http from "./http";
import { getAdminToken } from "../utils/auth";

/** PUBLIC: GET /subscriptions/plans  */
export const listPublicPlans = async () => {
  const { data } = await http.get("/subscriptions/plans");
  return data; // { success, count, plans: [...] }
};

/** ADMIN: GET /subscriptions/admin/plans  */
export const listAdminPlans = async () => {
  const token = getAdminToken();
  const { data } = await http.get("/subscriptions/admin/plans", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return data; // shape depends on backend (often same as public but may include inactive)
};

/** ADMIN: POST /subscriptions/admin/plans  */
export const createPlan = async (payload) => {
  const token = getAdminToken();
  const { data } = await http.post("/subscriptions/admin/plans", payload, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return data; // { success, message, plan: {...} }
};

/** ADMIN: PATCH /subscriptions/admin/plans/:planId  */
export const updatePlan = async (planId, payload) => {
  const token = getAdminToken();
  const { data } = await http.patch(`/subscriptions/admin/plans/${planId}`, payload, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return data;
};

/** ADMIN: DELETE /subscriptions/admin/plans/:planId  */
export const deletePlan = async (planId) => {
  const token = getAdminToken();
  const { data } = await http.delete(`/subscriptions/admin/plans/${planId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return data;
};

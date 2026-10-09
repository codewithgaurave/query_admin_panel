// src/apis/subAdmins.js
import http from "./http";
import { getAdminToken } from "../utils/auth";

const authHeaders = () => {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Super Admin: List all Sub Admins with survey stats
 */
export const listSubAdmins = async () => {
  const { data } = await http.get("/admin/subadmins", {
    headers: authHeaders(),
  });
  return data;
};

/**
 * Super Admin: Create a new Sub Admin
 */
export const createSubAdmin = async (payload) => {
  const { data } = await http.post("/admin/subadmins", payload, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
  });
  return data;
};

/**
 * Super Admin: Update a Sub Admin
 */
export const updateSubAdmin = async (id, payload) => {
  const { data } = await http.put(`/admin/subadmins/${id}`, payload, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
  });
  return data;
};

/**
 * Super Admin: Delete / Deactivate a Sub Admin
 */
export const deleteSubAdmin = async (id) => {
  const { data } = await http.delete(`/admin/subadmins/${id}`, {
    headers: authHeaders(),
  });
  return data;
};

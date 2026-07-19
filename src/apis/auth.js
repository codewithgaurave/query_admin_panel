// src/apis/auth.js
import http from "./http";

// POST /admin/login
// Body: { adminId, password }
// Response: { message, admin: { adminId, name, id }, token }
export const adminLogin = async ({ adminId, password }) => {
  const { data } = await http.post("/admin/login", { adminId, password });
  return data; // { message, admin, token }
};

export const getAdminProfile = async () => {
  const { data } = await http.get("/admin/profile");
  return data;
};

export const updateAdminProfile = async ({ name }) => {
  const { data } = await http.put("/admin/profile", { name });
  return data;
};

export const changeAdminPassword = async ({ oldPassword, newPassword }) => {
  const { data } = await http.post("/admin/change-password", { oldPassword, newPassword });
  return data;
};

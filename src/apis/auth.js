// src/apis/auth.js
import http from "./http";

// POST /admin/login
// Body: { adminId, password }
// Response: { message, admin: { adminId, name, id }, token }
export const adminLogin = async ({ adminId, password }) => {
  const { data } = await http.post("/admin/login", { adminId, password });
  return data; // { message, admin, token }
};

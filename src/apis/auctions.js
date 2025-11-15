import http from "./http";
import { getAdminToken } from "../utils/auth";

/**
 * GET /auctions/admin/auctions
 */
export const listAuctions = async ({ page = 1, limit = 50 } = {}) => {
  const token = getAdminToken(); // get token from localStorage
  const { data } = await http.get("/auctions/admin/auctions", {
    params: { page, limit },
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return data;
};
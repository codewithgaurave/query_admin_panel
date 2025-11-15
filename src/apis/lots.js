// src/apis/lots.js
import http from "./http";
import { getAdminToken } from "../utils/auth";

/**
 * GET /auctions/admin/lots
 * Query supported:
 *  - status, auctionId, sellerId, category, minPrice, maxPrice, search
 *  - page, limit
 */
export const listAdminLots = async (params = {}) => {
  const {
    page = 1,
    limit = 50,
    status,       // "active" | "sold" | "unsold" | "cancelled" | "all"
    auctionId,
    sellerId,
    category,
    minPrice,
    maxPrice,
    search,       // text
  } = params;

  const token = getAdminToken();
  const { data } = await http.get("/auctions/admin/lots", {
    params: {
      page, limit, status, auctionId, sellerId, category, minPrice, maxPrice, search,
    },
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return data; // { success, page, totalPages, totalLots, lots: [...] }
};

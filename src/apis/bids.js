// src/apis/bids.js
import http from "./http";
import { getAdminToken } from "../utils/auth";

/**
 * GET /bids/:lotId/list?page=&limit=
 * Returns: { success, lotId, page, totalPages, totalBids, bids: [...] }
 */
export const listBidsForLot = async (lotId, { page = 1, limit = 20 } = {}) => {
  const token = getAdminToken();
  const { data } = await http.get(`/bids/${lotId}/list`, {
    params: { page, limit },
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return data;
};

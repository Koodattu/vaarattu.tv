import { PaginationInfo } from "../types/api.types";
import { parsePositiveInteger, RequestValidationError } from "./validation";

export const parsePaginationQuery = (query: Record<string, unknown>): { page: number; limit: number } => {
  const page = parsePositiveInteger(query.page, "Page", 1);
  const limit = Math.min(100, parsePositiveInteger(query.limit, "Limit", 20));
  if ((page - 1) * limit > 2147483647) throw new RequestValidationError("Page is outside the supported range");

  return { page, limit };
};

export const createPaginationInfo = (page: number, limit: number, total: number): PaginationInfo => {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
};

export const calculateOffset = (page: number, limit: number): number => {
  return (page - 1) * limit;
};

import { PaginationQuery, PaginationInfo } from "../types/api.types";

export const parsePaginationQuery = (query: any): { page: number; limit: number } => {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 20));

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

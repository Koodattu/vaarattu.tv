import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../types/api.types";

export const errorHandler = (err: Error, req: Request, res: Response<ApiResponse>, next: NextFunction) => {
  console.error("API Error:", err);

  // Default error response
  const response: ApiResponse = {
    success: false,
    error: "Internal server error",
  };

  // Handle specific error types
  if (err.name === "ValidationError") {
    response.error = "Invalid request data";
    return res.status(400).json(response);
  }

  if (err.message.includes("not found")) {
    response.error = "Resource not found";
    return res.status(404).json(response);
  }

  // Default 500 error
  return res.status(500).json(response);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

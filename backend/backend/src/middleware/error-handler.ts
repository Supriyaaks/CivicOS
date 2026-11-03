import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodIssue } from 'zod';

export interface ApiError extends Error {
  statusCode: number;
  code?: string;
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 1. Handle Zod Validation Errors (HTTP 400)
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation Error',
        code: 'VALIDATION_ERROR',
        details: err.issues.map((issue: ZodIssue) => ({
          path: issue.path.join('.'),
          message: issue.message
        }))
      }
    });
  }

  // 2. Handle Custom ApiErrors (includes 404s from Service)
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code || 'API_ERROR'
      }
    });
  }

  // 3. Handle unexpected internal errors (HTTP 500)
  console.error(`[${new Date().toISOString()}] Internal Server Error:`, err);

  res.status(500).json({
    success: false,
    error: {
      message: 'An unexpected internal server error occurred.',
      code: 'INTERNAL_SERVER_ERROR'
    }
  });
};

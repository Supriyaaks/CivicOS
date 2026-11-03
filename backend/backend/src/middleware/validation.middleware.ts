import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodObject, any } from 'zod';
import { ApiError } from './error-handler';

export const validationMiddleware = (schema: ZodObject<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const apiError = new Error('Validation Error') as ApiError;
        apiError.statusCode = 400;
        apiError.code = 'VALIDATION_ERROR';
        (apiError as any).details = error.issues;
        return next(apiError);
      }
      next(error);
    }
  };
};

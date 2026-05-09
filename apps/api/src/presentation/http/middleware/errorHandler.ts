import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      error: error.code,
      message: error.message
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'validation_error',
      issues: error.issues
    });
    return;
  }

  console.error(error);

  res.status(500).json({
    error: 'internal_server_error'
  });
};

export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

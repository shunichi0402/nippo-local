import type { ErrorRequestHandler } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { HttpError } from '../../../application/errors.js';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      error: error.code,
      message: error.message
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    res.status(400).json({
      error: error.code === 'LIMIT_FILE_SIZE' ? 'photo_too_large' : 'upload_error',
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

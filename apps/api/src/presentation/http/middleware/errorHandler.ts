import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { ForbiddenError, NotFoundError } from '../../../application/errors.js';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'validation_error',
      fieldErrors: toFieldErrors(error),
      issues: error.issues
    });
    return;
  }

  if (error instanceof ForbiddenError) {
    res.status(403).json({
      error: error.message
    });
    return;
  }

  if (error instanceof NotFoundError) {
    res.status(404).json({
      error: error.message
    });
    return;
  }

  console.error(error);

  res.status(500).json({
    error: 'internal_server_error'
  });
};

function toFieldErrors(error: ZodError): Record<string, string[]> {
  return error.issues.reduce<Record<string, string[]>>((fieldErrors, issue) => {
    const field = issue.path[0]?.toString() ?? 'form';
    fieldErrors[field] = [...(fieldErrors[field] ?? []), issue.message];

    return fieldErrors;
  }, {});
}

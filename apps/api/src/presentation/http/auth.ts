import type { Request } from 'express';

export function getAuthUserId(req: Request): string {
  const header = req.header('x-user-id');

  return header?.trim() || 'local-user';
}

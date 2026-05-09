import fs from 'node:fs';
import path from 'node:path';
import { HttpError } from '../../application/errors.js';

export const allowedPhotoExtensions = ['jpg', 'jpeg', 'png', 'webp'] as const;
export const maxPhotoSizeBytes = 10 * 1024 * 1024;

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type StoredPhoto = {
  attachmentId: string;
  relativePath: string;
  absolutePath: string;
  fileName: string;
  extension: string;
};

export function validatePhotoUpload(file: Express.Multer.File): string {
  const extension = path.extname(file.originalname).replace('.', '').toLowerCase();

  if (!allowedPhotoExtensions.includes(extension as (typeof allowedPhotoExtensions)[number])) {
    throw new HttpError(400, 'unsupported_photo_type', 'jpg/jpeg/png/webp の写真を指定してください');
  }

  if (!allowedMimeTypes.has(file.mimetype)) {
    throw new HttpError(400, 'unsupported_photo_type', '対応していない MIME type です');
  }

  if (file.size > maxPhotoSizeBytes) {
    throw new HttpError(400, 'photo_too_large', '写真は 10MB 以内で指定してください');
  }

  return extension;
}

export function buildStoredPhoto(dataDir: string, attachmentId: string, extension: string): StoredPhoto {
  const fileName = `${attachmentId}.${extension}`;
  const relativePath = path.posix.join('uploads', 'photos', fileName);
  const absolutePath = path.join(dataDir, 'uploads', 'photos', fileName);

  return {
    attachmentId,
    relativePath,
    absolutePath,
    fileName,
    extension
  };
}

export function savePhotoFile(file: Express.Multer.File, destination: string): void {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, file.buffer);
}

export function deletePhotoFileIfExists(dataDir: string, relativePath: string): void {
  const absolutePath = path.join(dataDir, relativePath);

  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
}

import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { HttpError } from '../../../application/errors.js';
import { CreateRecordUseCase } from '../../../application/records/createRecord.js';
import { ListRecordsUseCase } from '../../../application/records/listRecords.js';
import type { AttachmentRepository } from '../../../domain/attachments/attachmentRepository.js';
import type { RecordRepository } from '../../../domain/records/recordRepository.js';
import { recordKinds } from '../../../domain/records/record.js';
import {
  buildStoredPhoto,
  deletePhotoFileIfExists,
  maxPhotoSizeBytes,
  savePhotoFile,
  validatePhotoUpload
} from '../../../infrastructure/storage/photoStorage.js';
import { createUuidV7 } from '../../../shared/uuidV7.js';
import { getAuthUserId } from '../auth.js';

const createRecordSchema = z.object({
  targetDate: z.string().min(1),
  title: z.string().min(1),
  body: z.string().optional(),
  kind: z.enum(recordKinds).optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().nullable().optional(),
  project: z.string().nullable().optional(),
  transcript: z.string().nullable().optional()
});

const photoRecordSchema = z.object({
  targetDate: z.string().min(1),
  title: z.string().max(120).optional(),
  body: z.string().optional(),
  caption: z.string().max(200).optional(),
  tags: z.string().optional(),
  category: z.string().max(30).optional(),
  project: z.string().max(50).optional()
});

const attachPhotoSchema = z.object({
  caption: z.string().max(200).optional()
});

const listRecordsSchema = z.object({
  keyword: z.string().optional(),
  targetDate: z.string().optional(),
  kind: z.string().optional(),
  tag: z.string().optional()
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxPhotoSizeBytes
  }
});

export function createRecordRouter(
  recordRepository: RecordRepository,
  attachmentRepository: AttachmentRepository,
  dataDir: string
): Router {
  const router = Router();
  const createRecord = new CreateRecordUseCase(recordRepository);
  const listRecords = new ListRecordsUseCase(recordRepository);

  router.get('/', (req, res, next) => {
    try {
      const query = listRecordsSchema.parse(req.query);
      res.json({ records: listRecords.execute(query) });
    } catch (error) {
      next(error);
    }
  });

  router.post('/', (req, res, next) => {
    try {
      const input = createRecordSchema.parse(req.body);
      res.status(201).json({ record: createRecord.execute({ ...input, ownerUserId: getAuthUserId(req) }) });
    } catch (error) {
      next(error);
    }
  });

  router.post('/photo', upload.single('imageFile'), (req, res, next) => {
    try {
      const file = getUploadedFile(req);
      const input = photoRecordSchema.parse(req.body);
      const extension = validatePhotoUpload(file);
      const attachmentId = createUuidV7();
      const storedPhoto = buildStoredPhoto(dataDir, attachmentId, extension);

      savePhotoFile(file, storedPhoto.absolutePath);

      try {
        const result = attachmentRepository.createPhotoRecord(
          {
            targetDate: input.targetDate,
            title: input.title?.trim() || '写真記録',
            body: input.body ?? '',
            tags: parseTags(input.tags),
            category: input.category || null,
            project: input.project || null,
            ownerUserId: getAuthUserId(req)
          },
          {
            id: attachmentId,
            relativePath: storedPhoto.relativePath,
            fileName: storedPhoto.fileName,
            originalName: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            caption: input.caption ?? ''
          }
        );

        res.status(201).json(result);
      } catch (error) {
        deletePhotoFileIfExists(dataDir, storedPhoto.relativePath);
        throw error;
      }
    } catch (error) {
      next(error);
    }
  });

  router.post('/:recordId/attachments', upload.single('imageFile'), (req, res, next) => {
    try {
      const recordId = String(req.params.recordId);
      const ownerUserId = recordRepository.findOwnerUserId(recordId);

      if (!ownerUserId) {
        throw new HttpError(404, 'record_not_found', '添付先の記録が見つかりません');
      }

      if (ownerUserId !== getAuthUserId(req)) {
        throw new HttpError(403, 'record_forbidden', '他ユーザーの記録には添付できません');
      }

      const file = getUploadedFile(req);
      const input = attachPhotoSchema.parse(req.body);
      const extension = validatePhotoUpload(file);
      const attachmentId = createUuidV7();
      const storedPhoto = buildStoredPhoto(dataDir, attachmentId, extension);

      savePhotoFile(file, storedPhoto.absolutePath);

      try {
        const attachment = attachmentRepository.createPhotoAttachment({
          id: attachmentId,
          recordId,
          relativePath: storedPhoto.relativePath,
          fileName: storedPhoto.fileName,
          originalName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          caption: input.caption ?? ''
        });

        res.status(201).json({ attachment });
      } catch (error) {
        deletePhotoFileIfExists(dataDir, storedPhoto.relativePath);
        throw error;
      }
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function getUploadedFile(req: Express.Request): Express.Multer.File {
  if (!req.file) {
    throw new HttpError(400, 'photo_required', 'imageFile を指定してください');
  }

  return req.file;
}

function parseTags(rawTags: string | undefined): string[] {
  if (!rawTags) {
    return [];
  }

  const parsed = rawTags.trim().startsWith('[') ? JSON.parse(rawTags) : rawTags.split(',');

  return z.array(z.string().trim().min(1).max(30)).max(10).parse(parsed);
}

import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../../../application/errors.js';
import { photoDeleteModes } from '../../../domain/attachments/attachment.js';
import type { AttachmentRepository } from '../../../domain/attachments/attachmentRepository.js';
import type { RecordRepository } from '../../../domain/records/recordRepository.js';
import { deletePhotoFileIfExists } from '../../../infrastructure/storage/photoStorage.js';
import { getAuthUserId } from '../auth.js';

const updateCaptionSchema = z.object({
  caption: z.string().max(200)
});

const deleteAttachmentSchema = z.object({
  deleteMode: z.enum(photoDeleteModes)
});

export function createAttachmentRouter(
  recordRepository: RecordRepository,
  attachmentRepository: AttachmentRepository,
  dataDir: string
): Router {
  const router = Router();

  router.get('/:attachmentId/file', (req, res, next) => {
    try {
      const attachment = findAttachmentOrThrow(attachmentRepository, req.params.attachmentId);
      const absolutePath = path.join(dataDir, attachment.relativePath);

      if (!fs.existsSync(absolutePath)) {
        throw new HttpError(404, 'photo_file_not_found', '写真ファイルが見つかりません');
      }

      res.type(attachment.mimeType);
      res.sendFile(absolutePath);
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:attachmentId', (req, res, next) => {
    try {
      const input = updateCaptionSchema.parse(req.body);
      const attachment = findAttachmentOrThrow(attachmentRepository, req.params.attachmentId);
      assertAttachmentOwner(recordRepository, attachment.recordId, getAuthUserId(req));

      const updatedAttachment = attachmentRepository.updatePhotoCaption(attachment.id, input.caption);

      if (!updatedAttachment) {
        throw new HttpError(404, 'photo_attachment_not_found', '写真添付が見つかりません');
      }

      res.json({ attachment: updatedAttachment });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:attachmentId', (req, res, next) => {
    try {
      const input = deleteAttachmentSchema.parse(req.body);
      const attachment = findAttachmentOrThrow(attachmentRepository, req.params.attachmentId);
      assertAttachmentOwner(recordRepository, attachment.recordId, getAuthUserId(req));

      if (input.deleteMode === 'detach_only') {
        const detachedAttachment = attachmentRepository.detachPhotoAttachment(attachment.id);
        res.json({ attachment: detachedAttachment });
        return;
      }

      const referenceCount = attachmentRepository.countPhotoReferences(attachment.relativePath);

      if (referenceCount > 1) {
        throw new HttpError(409, 'photo_file_still_referenced', '他の参照が残っているため実ファイルを削除できません');
      }

      const deletedAttachment = attachmentRepository.deletePhotoAttachmentMetadata(attachment.id);
      deletePhotoFileIfExists(dataDir, attachment.relativePath);
      res.json({ attachment: deletedAttachment, deletedFile: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function findAttachmentOrThrow(
  attachmentRepository: AttachmentRepository,
  attachmentId: string | undefined
) {
  const attachment = attachmentId ? attachmentRepository.findPhotoAttachmentById(attachmentId) : null;

  if (!attachment) {
    throw new HttpError(404, 'photo_attachment_not_found', '写真添付が見つかりません');
  }

  return attachment;
}

function assertAttachmentOwner(
  recordRepository: RecordRepository,
  recordId: string | null,
  authUserId: string
): void {
  if (!recordId) {
    return;
  }

  const ownerUserId = recordRepository.findOwnerUserId(recordId);

  if (ownerUserId && ownerUserId !== authUserId) {
    throw new HttpError(403, 'record_forbidden', '他ユーザーの記録は操作できません');
  }
}

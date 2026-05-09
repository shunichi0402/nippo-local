import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { z } from 'zod';
import { transcriptMethods, type NewRecord, type RecordItem } from '../../../domain/records/record.js';
import type { RecordRepository } from '../../../domain/records/recordRepository.js';
import { HttpError } from '../middleware/errorHandler.js';

const maxAudioBytes = 100 * 1024 * 1024;
const allowedExtensions = ['m4a', 'mp3', 'wav', 'webm'] as const;
const allowedMimeTypes = new Map<string, (typeof allowedExtensions)[number]>([
  ['audio/mp4', 'm4a'],
  ['audio/m4a', 'm4a'],
  ['audio/x-m4a', 'm4a'],
  ['audio/mpeg', 'mp3'],
  ['audio/mp3', 'mp3'],
  ['audio/wav', 'wav'],
  ['audio/x-wav', 'wav'],
  ['audio/webm', 'webm']
]);

const activeRecordings = new Map<string, { id: string; startedAt: string }>();

const authUserIdSchema = z.string().min(1).max(100);
const tagsSchema = z.array(z.string().trim().min(1).max(30)).max(10).optional();

const audioPayloadSchema = z.object({
  authUserId: authUserIdSchema,
  recordId: z.string().min(1).optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  title: z.string().trim().max(120).optional(),
  tags: tagsSchema,
  category: z.string().trim().max(30).nullable().optional(),
  project: z.string().trim().max(50).nullable().optional(),
  audioData: z.string().min(1),
  originalFileName: z.string().trim().max(255).optional(),
  mimeType: z.string().trim().max(100).optional(),
  durationSeconds: z.number().nonnegative().optional(),
  transcriptText: z.string().max(50000).optional(),
  transcriptMethod: z.enum(transcriptMethods).optional()
});

const startRecordingSchema = z.object({
  authUserId: authUserIdSchema
});

const transcriptSchema = z.object({
  authUserId: authUserIdSchema,
  transcriptText: z.string().max(50000),
  transcriptMethod: z.enum(transcriptMethods)
});

export function createAudioRouter(recordRepository: RecordRepository, dataDir: string): Router {
  const router = Router();

  router.post('/recording/start', (req, res, next) => {
    try {
      const input = startRecordingSchema.parse(req.body);

      if (activeRecordings.has(input.authUserId)) {
        throw new HttpError(409, 'recording_already_started', 'Recording is already active');
      }

      const recording = {
        id: createUuidV7(),
        startedAt: new Date().toISOString()
      };

      activeRecordings.set(input.authUserId, recording);
      res.status(201).json({ recording });
    } catch (error) {
      next(error);
    }
  });

  router.post('/recording/stop', (req, res, next) => {
    try {
      const input = audioPayloadSchema.parse(req.body);

      if (!activeRecordings.has(input.authUserId)) {
        throw new HttpError(409, 'recording_not_started', 'Recording is not active');
      }

      const result = saveAudioInput(recordRepository, dataDir, {
        ...input,
        source: 'recording',
        originalFileName: input.originalFileName ?? 'recording.webm'
      });

      activeRecordings.delete(input.authUserId);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post('/upload', (req, res, next) => {
    try {
      const input = audioPayloadSchema.parse(req.body);
      res.status(201).json(saveAudioInput(recordRepository, dataDir, { ...input, source: 'upload' }));
    } catch (error) {
      next(error);
    }
  });

  router.put('/records/:recordId/attachments/:attachmentId/transcript', (req, res, next) => {
    try {
      const input = transcriptSchema.parse(req.body);
      const record = requireOwnedRecord(recordRepository, req.params.recordId, input.authUserId);

      const attachment = recordRepository.updateTranscript({
        recordId: record.id,
        attachmentId: req.params.attachmentId,
        transcriptText: input.transcriptText,
        transcriptMethod: input.transcriptMethod
      });

      res.json({
        record: recordRepository.findById(record.id),
        attachment
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

type SaveAudioInput = z.infer<typeof audioPayloadSchema> & {
  source: 'recording' | 'upload';
};

function saveAudioInput(recordRepository: RecordRepository, dataDir: string, input: SaveAudioInput) {
  if (!input.recordId && !input.targetDate) {
    throw new HttpError(400, 'target_date_required', 'targetDate is required for standalone audio records');
  }

  const audio = parseAudioData(input.audioData, input.mimeType, input.originalFileName);
  const attachmentId = createUuidV7();
  const fileName = `${attachmentId}.${audio.extension}`;
  const storagePath = `audio/${fileName}`;
  const audioDir = path.join(dataDir, 'audio');
  const absolutePath = path.join(dataDir, storagePath);

  fs.mkdirSync(audioDir, { recursive: true });
  fs.writeFileSync(absolutePath, audio.buffer);

  try {
    const record = input.recordId
      ? requireOwnedRecord(recordRepository, input.recordId, input.authUserId)
      : createStandaloneAudioRecord(recordRepository, input);

    const attachment = recordRepository.createAudioAttachment({
      id: attachmentId,
      recordId: record.id,
      storagePath,
      fileName,
      originalFileName: input.originalFileName ?? null,
      mimeType: audio.mimeType,
      sizeBytes: audio.buffer.byteLength,
      durationSeconds: input.durationSeconds ?? null
    });

    const updatedAttachment =
      input.transcriptText !== undefined
        ? recordRepository.updateTranscript({
            recordId: record.id,
            attachmentId: attachment.id,
            transcriptText: input.transcriptText,
            transcriptMethod: input.transcriptMethod ?? 'manual'
          })
        : attachment;

    return {
      record: recordRepository.findById(record.id),
      attachment: updatedAttachment
    };
  } catch (error) {
    fs.rmSync(absolutePath, { force: true });
    throw error;
  }
}

function createStandaloneAudioRecord(recordRepository: RecordRepository, input: SaveAudioInput): RecordItem {
  const record: NewRecord = {
    ownerUserId: input.authUserId,
    targetDate: input.targetDate!,
    title: input.title || `音声メモ ${input.targetDate}`,
    body: '',
    kind: 'audio',
    tags: input.tags ?? [],
    category: input.category ?? null,
    project: input.project ?? null
  };

  return recordRepository.create(record);
}

function requireOwnedRecord(recordRepository: RecordRepository, recordId: string, authUserId: string): RecordItem {
  const record = recordRepository.findById(recordId);

  if (!record) {
    throw new HttpError(404, 'record_not_found', 'Record was not found');
  }

  if (record.ownerUserId !== authUserId) {
    throw new HttpError(403, 'record_forbidden', 'Record belongs to another user');
  }

  return record;
}

function parseAudioData(audioData: string, mimeType?: string, originalFileName?: string) {
  const dataUrlMatch = audioData.match(/^data:([^;]+);base64,(.+)$/);
  const inferredMimeType = normalizeMimeType(mimeType ?? dataUrlMatch?.[1] ?? '');
  const base64 = dataUrlMatch?.[2] ?? audioData;
  const buffer = Buffer.from(base64, 'base64');

  if (buffer.byteLength === 0) {
    throw new HttpError(400, 'audio_empty', 'Audio data is empty');
  }

  if (buffer.byteLength > maxAudioBytes) {
    throw new HttpError(413, 'audio_too_large', 'Audio file must be 100MB or smaller');
  }

  const extension = inferExtension(inferredMimeType, originalFileName);

  if (!extension) {
    throw new HttpError(400, 'audio_format_not_supported', 'Audio format must be m4a, mp3, wav, or webm');
  }

  const resolvedMimeType = inferredMimeType || mimeTypeFromExtension(extension);

  return {
    buffer,
    mimeType: resolvedMimeType,
    extension
  };
}

function inferExtension(
  mimeType: string,
  originalFileName?: string
): (typeof allowedExtensions)[number] | null {
  const originalExtension = originalFileName?.split('.').pop()?.toLowerCase();

  if (isAllowedExtension(originalExtension)) {
    return originalExtension;
  }

  return allowedMimeTypes.get(mimeType) ?? null;
}

function normalizeMimeType(mimeType: string): string {
  return mimeType.split(';')[0]?.trim().toLowerCase() ?? '';
}

function isAllowedExtension(extension: string | undefined): extension is (typeof allowedExtensions)[number] {
  return allowedExtensions.some((allowed) => allowed === extension);
}

function mimeTypeFromExtension(extension: (typeof allowedExtensions)[number]): string {
  const mimeTypes: Record<(typeof allowedExtensions)[number], string> = {
    m4a: 'audio/mp4',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    webm: 'audio/webm'
  };

  return mimeTypes[extension];
}

function createUuidV7(): string {
  const random = crypto.randomBytes(10);
  const bytes = Buffer.alloc(16);
  const timestamp = BigInt(Date.now());

  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = Number((timestamp >> BigInt((5 - index) * 8)) & 0xffn);
  }

  bytes[6] = 0x70 | (random[0] & 0x0f);
  bytes[7] = random[1];
  bytes[8] = 0x80 | (random[2] & 0x3f);
  random.copy(bytes, 9, 3);

  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

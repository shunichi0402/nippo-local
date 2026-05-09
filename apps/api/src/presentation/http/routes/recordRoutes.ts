import { Router } from 'express';
import { z } from 'zod';
import { CreateRecordUseCase } from '../../../application/records/createRecord.js';
import { ListRecordsUseCase } from '../../../application/records/listRecords.js';
import type { RecordRepository } from '../../../domain/records/recordRepository.js';
import { recordKinds, transcriptMethods } from '../../../domain/records/record.js';

const createRecordSchema = z.object({
  authUserId: z.string().min(1).optional(),
  targetDate: z.string().min(1),
  title: z.string().min(1),
  body: z.string().optional(),
  kind: z.enum(recordKinds).optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().nullable().optional(),
  project: z.string().nullable().optional(),
  transcript: z.string().nullable().optional(),
  transcriptMethod: z.enum(transcriptMethods).nullable().optional()
});

const listRecordsSchema = z.object({
  keyword: z.string().optional(),
  targetDate: z.string().optional(),
  kind: z.string().optional(),
  tag: z.string().optional()
});

export function createRecordRouter(recordRepository: RecordRepository): Router {
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
      res.status(201).json({
        record: createRecord.execute({
          ...input,
          ownerUserId: input.authUserId ?? 'local-user'
        })
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

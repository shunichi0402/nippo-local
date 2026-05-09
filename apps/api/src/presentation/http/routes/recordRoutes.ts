import { Router } from 'express';
import { z } from 'zod';
import { CreateRecordUseCase } from '../../../application/records/createRecord.js';
import { DeleteRecordUseCase } from '../../../application/records/deleteRecord.js';
import { ListRecordsUseCase } from '../../../application/records/listRecords.js';
import { UpdateRecordUseCase } from '../../../application/records/updateRecord.js';
import type { RecordRepository } from '../../../domain/records/recordRepository.js';
import { recordKinds } from '../../../domain/records/record.js';

const targetDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD形式で入力してください')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);

    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, '存在する日付を入力してください');

const nullableTextSchema = (max: number) =>
  z
    .union([z.string().max(max), z.null()])
    .optional()
    .transform((value) => {
      const text = value?.trim();

      return text ? text : null;
    });

const tagSchema = z.string().trim().min(1, 'タグを入力してください').max(30, 'タグは30文字以内で入力してください');

const recordInputSchema = z.object({
  targetDate: targetDateSchema,
  title: z.string().max(120, 'タイトルは120文字以内で入力してください').optional().default(''),
  body: z
    .string()
    .max(10000, '本文は10000文字以内で入力してください')
    .refine((value) => value.trim().length > 0, '本文を入力してください'),
  kind: z.enum(recordKinds).optional(),
  tags: z
    .array(tagSchema)
    .optional()
    .default([])
    .transform((tags) => [...new Set(tags)])
    .pipe(z.array(tagSchema).max(10, 'タグは10件以内で入力してください')),
  category: nullableTextSchema(30),
  project: nullableTextSchema(50),
  transcript: z.string().nullable().optional()
});

const listRecordsSchema = z.object({
  keyword: z.string().optional(),
  targetDate: targetDateSchema.optional(),
  kind: z.enum(recordKinds).optional(),
  tag: z.string().optional()
});

export function createRecordRouter(recordRepository: RecordRepository): Router {
  const router = Router();
  const createRecord = new CreateRecordUseCase(recordRepository);
  const listRecords = new ListRecordsUseCase(recordRepository);
  const updateRecord = new UpdateRecordUseCase(recordRepository);
  const deleteRecord = new DeleteRecordUseCase(recordRepository);

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
      const input = recordInputSchema.parse(req.body);
      res.status(201).json({
        record: createRecord.execute({
          ...input,
          ownerUserId: getAuthUserId(req)
        })
      });
    } catch (error) {
      next(error);
    }
  });

  router.put('/:id', (req, res, next) => {
    try {
      const input = recordInputSchema.parse(req.body);
      res.json({ record: updateRecord.execute(req.params.id, input, getAuthUserId(req)) });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', (req, res, next) => {
    try {
      deleteRecord.execute(req.params.id, getAuthUserId(req));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function getAuthUserId(req: { header(name: string): string | undefined }): string {
  return req.header('x-user-id')?.trim() || 'local-user';
}

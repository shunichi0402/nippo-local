import { Router } from 'express';
import { z } from 'zod';
import { CreateRecordUseCase } from '../../../application/records/createRecord.js';
import { ListRecordsUseCase } from '../../../application/records/listRecords.js';
import type { RecordRepository } from '../../../domain/records/recordRepository.js';
import { recordKinds } from '../../../domain/records/record.js';

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

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 形式で指定してください');

const listRecordsSchema = z
  .object({
    keyword: z.preprocess(trimString, z.string().min(1, '空白のみの keyword は指定できません').max(100).optional()),
    fromDate: dateSchema.optional(),
    toDate: dateSchema.optional(),
    targetDate: dateSchema.optional(),
    tags: z.preprocess(toStringList, z.array(z.string().min(1)).optional()),
    tag: z.preprocess(trimString, z.string().min(1).optional()),
    types: z.preprocess(toStringList, z.array(z.enum(recordKinds)).optional()),
    kind: z.enum(recordKinds).optional(),
    sort: z.enum(['targetDate_desc', 'targetDate_asc', 'updatedAt_desc']).default('targetDate_desc'),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20)
  })
  .transform((query) => {
    const fromDate = query.targetDate ?? query.fromDate;
    const toDate = query.targetDate ?? query.toDate;
    const tags = unique([...(query.tags ?? []), ...(query.tag ? [query.tag] : [])]);
    const types = unique([...(query.types ?? []), ...(query.kind ? [query.kind] : [])]);

    return {
      keyword: query.keyword,
      fromDate,
      toDate,
      tags,
      types,
      sort: query.sort,
      page: query.page,
      pageSize: query.pageSize
    };
  })
  .superRefine((query, context) => {
    if (query.fromDate && query.toDate && query.fromDate > query.toDate) {
      context.addIssue({
        code: 'custom',
        path: ['fromDate'],
        message: 'fromDate は toDate 以前の日付を指定してください'
      });
    }
  });

export function createRecordRouter(recordRepository: RecordRepository): Router {
  const router = Router();
  const createRecord = new CreateRecordUseCase(recordRepository);
  const listRecords = new ListRecordsUseCase(recordRepository);

  router.get('/', (req, res, next) => {
    try {
      const query = listRecordsSchema.parse(req.query);
      const result = listRecords.execute(query);
      res.json({
        ...result,
        records: result.items
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', (req, res, next) => {
    try {
      const record = recordRepository.findById(req.params.id);

      if (!record) {
        res.status(404).json({
          error: 'record_not_found',
          message: '指定された記録は見つかりませんでした'
        });
        return;
      }

      res.json({ record });
    } catch (error) {
      next(error);
    }
  });

  router.post('/', (req, res, next) => {
    try {
      const input = createRecordSchema.parse(req.body);
      res.status(201).json({ record: createRecord.execute(input) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function toStringList(value: unknown): unknown {
  if (typeof value === 'undefined') {
    return undefined;
  }

  const values = Array.isArray(value) ? value : [value];
  const list = values
    .filter((item): item is string => typeof item === 'string')
    .flatMap((item) => item.split(','))
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return list.length > 0 ? list : undefined;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

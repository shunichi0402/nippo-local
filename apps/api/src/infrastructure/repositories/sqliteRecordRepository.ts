import { randomUUID } from 'node:crypto';
import type { NewRecord, RecordItem, RecordKind } from '../../domain/records/record.js';
import type { RecordRepository, RecordSearchQuery, RecordSearchResult, RecordSort } from '../../domain/records/recordRepository.js';
import type { SqliteConnection } from '../database/sqlite/connection.js';

type RecordRow = {
  id: string;
  target_date: string;
  title: string;
  body: string;
  kind: RecordKind;
  tags_json: string;
  category: string | null;
  project: string | null;
  transcript: string | null;
  created_at: string;
  updated_at: string;
};

type CountRow = {
  totalCount: number;
};

export class SqliteRecordRepository implements RecordRepository {
  constructor(private readonly db: SqliteConnection) {}

  create(record: NewRecord): RecordItem {
    const now = new Date().toISOString();
    const item: RecordItem = {
      id: randomUUID(),
      targetDate: record.targetDate,
      title: record.title,
      body: record.body ?? '',
      kind: record.kind ?? 'memo',
      tags: record.tags ?? [],
      category: record.category ?? null,
      project: record.project ?? null,
      transcript: record.transcript ?? null,
      createdAt: now,
      updatedAt: now
    };

    this.db
      .prepare(`
        INSERT INTO records (
          id, target_date, title, body, kind, tags_json, category, project, transcript, created_at, updated_at
        )
        VALUES (
          @id, @targetDate, @title, @body, @kind, @tagsJson, @category, @project, @transcript, @createdAt, @updatedAt
        )
      `)
      .run({
        ...item,
        tagsJson: JSON.stringify(item.tags)
      });

    return item;
  }

  list(query: RecordSearchQuery): RecordSearchResult {
    const conditions: string[] = [];
    const params: Record<string, number | string> = {
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize
    };

    if (query.keyword) {
      conditions.push(`
        (
          title LIKE @keyword ESCAPE char(92)
          OR body LIKE @keyword ESCAPE char(92)
          OR tags_json LIKE @keyword ESCAPE char(92)
          OR category LIKE @keyword ESCAPE char(92)
          OR project LIKE @keyword ESCAPE char(92)
          OR transcript LIKE @keyword ESCAPE char(92)
        )
      `);
      params.keyword = `%${escapeLike(query.keyword)}%`;
    }

    if (query.fromDate) {
      conditions.push('target_date >= @fromDate');
      params.fromDate = query.fromDate;
    }

    if (query.toDate) {
      conditions.push('target_date <= @toDate');
      params.toDate = query.toDate;
    }

    if (query.types && query.types.length > 0) {
      const typeParams = query.types.map((type, index) => {
        const key = `type${index}`;
        params[key] = type;
        return `@${key}`;
      });
      conditions.push(`kind IN (${typeParams.join(', ')})`);
    }

    if (query.tags && query.tags.length > 0) {
      query.tags.forEach((tag, index) => {
        const key = `tag${index}`;
        params[key] = tag;
        conditions.push(`
          EXISTS (
            SELECT 1
            FROM json_each(records.tags_json)
            WHERE json_each.value = @${key}
          )
        `);
      });
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const total = this.db
      .prepare(`SELECT COUNT(*) AS totalCount FROM records ${where}`)
      .get(params) as CountRow;

    const rows = this.db
      .prepare(`
        SELECT *
        FROM records
        ${where}
        ORDER BY ${orderBy(query.sort)}
        LIMIT @limit OFFSET @offset
      `)
      .all(params) as RecordRow[];

    return {
      items: rows.map(mapRow),
      totalCount: total.totalCount,
      page: query.page,
      pageSize: query.pageSize
    };
  }

  findById(id: string): RecordItem | null {
    const row = this.db.prepare('SELECT * FROM records WHERE id = ?').get(id) as RecordRow | undefined;

    return row ? mapRow(row) : null;
  }
}

function orderBy(sort: RecordSort): string {
  const clauses: Record<RecordSort, string> = {
    targetDate_desc: 'target_date DESC, created_at DESC',
    targetDate_asc: 'target_date ASC, created_at ASC',
    updatedAt_desc: 'updated_at DESC, created_at DESC'
  };

  return clauses[sort];
}

function escapeLike(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
}

function mapRow(row: RecordRow): RecordItem {
  return {
    id: row.id,
    targetDate: row.target_date,
    title: row.title,
    body: row.body,
    kind: row.kind,
    tags: JSON.parse(row.tags_json) as string[],
    category: row.category,
    project: row.project,
    transcript: row.transcript,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

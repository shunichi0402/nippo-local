import { randomUUID } from 'node:crypto';
import type { NewRecord, RecordItem, RecordKind } from '../../domain/records/record.js';
import type { RecordRepository, RecordSearchQuery } from '../../domain/records/recordRepository.js';
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

  list(query: RecordSearchQuery = {}): RecordItem[] {
    const conditions: string[] = [];
    const params: Record<string, string> = {};

    if (query.keyword) {
      conditions.push(`
        records.rowid IN (
          SELECT rowid FROM record_fts WHERE record_fts MATCH @keyword
        )
      `);
      params.keyword = query.keyword;
    }

    if (query.targetDate) {
      conditions.push('target_date = @targetDate');
      params.targetDate = query.targetDate;
    }

    if (query.kind) {
      conditions.push('kind = @kind');
      params.kind = query.kind;
    }

    if (query.tag) {
      conditions.push('tags_json LIKE @tag');
      params.tag = `%${query.tag}%`;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = this.db
      .prepare(`SELECT * FROM records ${where} ORDER BY target_date DESC, created_at DESC`)
      .all(params) as RecordRow[];

    return rows.map(mapRow);
  }

  findById(id: string): RecordItem | null {
    const row = this.db.prepare('SELECT * FROM records WHERE id = ?').get(id) as RecordRow | undefined;

    return row ? mapRow(row) : null;
  }
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


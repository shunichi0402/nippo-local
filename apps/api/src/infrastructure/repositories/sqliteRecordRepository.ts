import { randomUUID } from 'node:crypto';
import type { NewRecord, RecordItem, RecordKind, UpdateRecord } from '../../domain/records/record.js';
import type { RecordRepository, RecordSearchQuery } from '../../domain/records/recordRepository.js';
import type { SqliteConnection } from '../database/sqlite/connection.js';

type RecordRow = {
  id: string;
  owner_user_id: string;
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
      ownerUserId: record.ownerUserId,
      targetDate: record.targetDate,
      title: record.title,
      body: record.body,
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
          id, owner_user_id, target_date, title, body, kind, tags_json, category, project, transcript, created_at, updated_at
        )
        VALUES (
          @id, @ownerUserId, @targetDate, @title, @body, @kind, @tagsJson, @category, @project, @transcript, @createdAt, @updatedAt
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
      params.keyword = escapeFtsQuery(query.keyword);
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

  update(id: string, record: UpdateRecord): RecordItem | null {
    const now = new Date().toISOString();

    const result = this.db
      .prepare(`
        UPDATE records
        SET
          target_date = @targetDate,
          title = @title,
          body = @body,
          kind = @kind,
          tags_json = @tagsJson,
          category = @category,
          project = @project,
          transcript = @transcript,
          updated_at = @updatedAt
        WHERE id = @id
      `)
      .run({
        id,
        targetDate: record.targetDate,
        title: record.title,
        body: record.body,
        kind: record.kind ?? 'memo',
        tagsJson: JSON.stringify(record.tags ?? []),
        category: record.category ?? null,
        project: record.project ?? null,
        transcript: record.transcript ?? null,
        updatedAt: now
      });

    if (result.changes === 0) {
      return null;
    }

    return this.findById(id);
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM records WHERE id = ?').run(id);

    return result.changes > 0;
  }
}

function escapeFtsQuery(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function mapRow(row: RecordRow): RecordItem {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
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

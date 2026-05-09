import { randomUUID } from 'node:crypto';
import type {
  NewPhotoAttachment,
  PhotoAttachment
} from '../../domain/attachments/attachment.js';
import type { AttachmentRepository } from '../../domain/attachments/attachmentRepository.js';
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
  owner_user_id: string;
  created_at: string;
  updated_at: string;
};

type PhotoAttachmentRow = {
  id: string;
  record_id: string | null;
  relative_path: string;
  file_name: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  caption: string;
  created_at: string;
  updated_at: string;
};

export class SqliteRecordRepository implements RecordRepository, AttachmentRepository {
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
      ownerUserId: record.ownerUserId ?? 'local-user',
      attachments: [],
      createdAt: now,
      updatedAt: now
    };

    this.db
      .prepare(`
        INSERT INTO records (
          id, target_date, title, body, kind, tags_json, category, project, transcript, owner_user_id, created_at, updated_at
        )
        VALUES (
          @id, @targetDate, @title, @body, @kind, @tagsJson, @category, @project, @transcript, @ownerUserId, @createdAt, @updatedAt
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
        (
          records.rowid IN (
            SELECT rowid FROM record_fts WHERE record_fts MATCH @keyword
          )
          OR EXISTS (
            SELECT 1 FROM photo_attachments
            WHERE photo_attachments.record_id = records.id
              AND photo_attachments.caption LIKE @keywordLike
          )
        )
      `);
      params.keyword = query.keyword;
      params.keywordLike = `%${query.keyword}%`;
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

    return this.withAttachments(rows.map(mapRow));
  }

  findById(id: string): RecordItem | null {
    const row = this.db.prepare('SELECT * FROM records WHERE id = ?').get(id) as RecordRow | undefined;

    return row ? this.withAttachments([mapRow(row)])[0] : null;
  }

  findOwnerUserId(id: string): string | null {
    const row = this.db.prepare('SELECT owner_user_id FROM records WHERE id = ?').get(id) as
      | { owner_user_id: string }
      | undefined;

    return row?.owner_user_id ?? null;
  }

  createPhotoAttachment(input: NewPhotoAttachment): PhotoAttachment {
    const now = new Date().toISOString();

    this.db
      .prepare(`
        INSERT INTO photo_attachments (
          id, record_id, relative_path, file_name, original_name, mime_type, size_bytes, caption, created_at, updated_at
        )
        VALUES (
          @id, @recordId, @relativePath, @fileName, @originalName, @mimeType, @sizeBytes, @caption, @createdAt, @updatedAt
        )
      `)
      .run({
        ...input,
        caption: input.caption ?? '',
        createdAt: now,
        updatedAt: now
      });

    const attachment = this.findPhotoAttachmentById(input.id);

    if (!attachment) {
      throw new Error('Failed to create photo attachment');
    }

    return attachment;
  }

  createPhotoRecord(
    record: NewRecord,
    attachment: Omit<NewPhotoAttachment, 'recordId'>
  ): { record: RecordItem; attachment: PhotoAttachment } {
    const transaction = this.db.transaction(() => {
      const createdRecord = this.create({ ...record, kind: 'photo' });
      const createdAttachment = this.createPhotoAttachment({
        ...attachment,
        recordId: createdRecord.id
      });

      return {
        record: this.findById(createdRecord.id) ?? createdRecord,
        attachment: createdAttachment
      };
    });

    return transaction();
  }

  findPhotoAttachmentById(id: string): PhotoAttachment | null {
    const row = this.db
      .prepare('SELECT * FROM photo_attachments WHERE id = ?')
      .get(id) as PhotoAttachmentRow | undefined;

    return row ? mapAttachmentRow(row) : null;
  }

  listPhotoAttachmentsByRecordIds(recordIds: string[]): Map<string, PhotoAttachment[]> {
    const result = new Map<string, PhotoAttachment[]>();

    if (recordIds.length === 0) {
      return result;
    }

    const placeholders = recordIds.map(() => '?').join(', ');
    const rows = this.db
      .prepare(`SELECT * FROM photo_attachments WHERE record_id IN (${placeholders}) ORDER BY created_at ASC`)
      .all(...recordIds) as PhotoAttachmentRow[];

    for (const row of rows) {
      if (!row.record_id) {
        continue;
      }

      const attachments = result.get(row.record_id) ?? [];
      attachments.push(mapAttachmentRow(row));
      result.set(row.record_id, attachments);
    }

    return result;
  }

  updatePhotoCaption(id: string, caption: string): PhotoAttachment | null {
    const now = new Date().toISOString();

    this.db
      .prepare('UPDATE photo_attachments SET caption = ?, updated_at = ? WHERE id = ?')
      .run(caption, now, id);

    return this.findPhotoAttachmentById(id);
  }

  detachPhotoAttachment(id: string): PhotoAttachment | null {
    const now = new Date().toISOString();

    this.db
      .prepare('UPDATE photo_attachments SET record_id = NULL, updated_at = ? WHERE id = ?')
      .run(now, id);

    return this.findPhotoAttachmentById(id);
  }

  deletePhotoAttachmentMetadata(id: string): PhotoAttachment | null {
    const attachment = this.findPhotoAttachmentById(id);

    if (!attachment) {
      return null;
    }

    this.db.prepare('DELETE FROM photo_attachments WHERE id = ?').run(id);

    return attachment;
  }

  countPhotoReferences(relativePath: string): number {
    const row = this.db
      .prepare('SELECT COUNT(*) AS count FROM photo_attachments WHERE relative_path = ? AND record_id IS NOT NULL')
      .get(relativePath) as { count: number };

    return row.count;
  }

  private withAttachments(records: RecordItem[]): RecordItem[] {
    const attachments = this.listPhotoAttachmentsByRecordIds(records.map((record) => record.id));

    return records.map((record) => ({
      ...record,
      attachments: attachments.get(record.id) ?? []
    }));
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
    ownerUserId: row.owner_user_id,
    attachments: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapAttachmentRow(row: PhotoAttachmentRow): PhotoAttachment {
  return {
    id: row.id,
    recordId: row.record_id,
    relativePath: row.relative_path,
    fileName: row.file_name,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    caption: row.caption,
    previewUrl: `/api/attachments/${row.id}/file`,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

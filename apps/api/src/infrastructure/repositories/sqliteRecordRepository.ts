import { randomUUID } from 'node:crypto';
import type {
  AudioAttachment,
  NewAudioAttachment,
  NewRecord,
  RecordItem,
  RecordKind,
  TranscriptMethod,
  TranscriptUpdate
} from '../../domain/records/record.js';
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
  transcript_method: TranscriptMethod | null;
  created_at: string;
  updated_at: string;
};

type AudioAttachmentRow = {
  id: string;
  record_id: string;
  storage_path: string;
  file_name: string;
  original_file_name: string | null;
  mime_type: string;
  size_bytes: number;
  duration_seconds: number | null;
  transcript_id: string | null;
  transcript_text: string | null;
  transcript_method: TranscriptMethod | null;
  transcript_created_at: string | null;
  transcript_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

export class SqliteRecordRepository implements RecordRepository {
  constructor(private readonly db: SqliteConnection) {}

  create(record: NewRecord): RecordItem {
    const now = new Date().toISOString();
    const item: RecordItem = {
      id: randomUUID(),
      ownerUserId: record.ownerUserId ?? 'local-user',
      targetDate: record.targetDate,
      title: record.title,
      body: record.body ?? '',
      kind: record.kind ?? 'memo',
      tags: record.tags ?? [],
      category: record.category ?? null,
      project: record.project ?? null,
      transcript: record.transcript ?? null,
      transcriptMethod: record.transcriptMethod ?? null,
      audioAttachments: [],
      createdAt: now,
      updatedAt: now
    };

    this.db
      .prepare(`
        INSERT INTO records (
          id, owner_user_id, target_date, title, body, kind, tags_json, category, project,
          transcript, transcript_method, created_at, updated_at
        )
        VALUES (
          @id, @ownerUserId, @targetDate, @title, @body, @kind, @tagsJson, @category, @project,
          @transcript, @transcriptMethod, @createdAt, @updatedAt
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

    return rows.map((row) => mapRow(row, this.findAttachments(row.id)));
  }

  findById(id: string): RecordItem | null {
    const row = this.db.prepare('SELECT * FROM records WHERE id = ?').get(id) as RecordRow | undefined;

    return row ? mapRow(row, this.findAttachments(row.id)) : null;
  }

  createAudioAttachment(attachment: NewAudioAttachment): AudioAttachment {
    const now = new Date().toISOString();
    const created = {
      id: attachment.id,
      recordId: attachment.recordId,
      storagePath: attachment.storagePath,
      fileName: attachment.fileName,
      originalFileName: attachment.originalFileName ?? null,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      durationSeconds: attachment.durationSeconds ?? null,
      transcriptId: null,
      transcriptText: null,
      transcriptMethod: null,
      transcriptCreatedAt: null,
      transcriptUpdatedAt: null,
      createdAt: now,
      updatedAt: now
    } satisfies AudioAttachment;

    this.db
      .prepare(`
        INSERT INTO audio_attachments (
          id, record_id, storage_path, file_name, original_file_name, mime_type, size_bytes,
          duration_seconds, created_at, updated_at
        )
        VALUES (
          @id, @recordId, @storagePath, @fileName, @originalFileName, @mimeType, @sizeBytes,
          @durationSeconds, @createdAt, @updatedAt
        )
      `)
      .run(created);

    return created;
  }

  updateTranscript(input: TranscriptUpdate): AudioAttachment {
    const current = this.findAttachment(input.recordId, input.attachmentId);

    if (!current) {
      throw new Error('Audio attachment not found');
    }

    const now = new Date().toISOString();
    const transcriptId = current.transcriptId ?? randomUUID();
    const transcriptCreatedAt = current.transcriptCreatedAt ?? now;

    const update = this.db.transaction(() => {
      this.db
        .prepare(`
          UPDATE audio_attachments
          SET
            transcript_id = @transcriptId,
            transcript_text = @transcriptText,
            transcript_method = @transcriptMethod,
            transcript_created_at = @transcriptCreatedAt,
            transcript_updated_at = @transcriptUpdatedAt,
            updated_at = @updatedAt
          WHERE id = @attachmentId AND record_id = @recordId
        `)
        .run({
          transcriptId,
          transcriptText: input.transcriptText,
          transcriptMethod: input.transcriptMethod,
          transcriptCreatedAt,
          transcriptUpdatedAt: now,
          updatedAt: now,
          attachmentId: current.id,
          recordId: input.recordId
        });

      this.refreshRecordTranscript(input.recordId);
    });

    update();

    const updated = this.findAttachment(input.recordId, current.id);

    if (!updated) {
      throw new Error('Audio attachment not found after transcript update');
    }

    return updated;
  }

  private findAttachments(recordId: string): AudioAttachment[] {
    const rows = this.db
      .prepare('SELECT * FROM audio_attachments WHERE record_id = ? ORDER BY created_at ASC')
      .all(recordId) as AudioAttachmentRow[];

    return rows.map(mapAttachmentRow);
  }

  private findAttachment(recordId: string, attachmentId?: string): AudioAttachment | null {
    const row = attachmentId
      ? (this.db
          .prepare('SELECT * FROM audio_attachments WHERE record_id = ? AND id = ?')
          .get(recordId, attachmentId) as AudioAttachmentRow | undefined)
      : (this.db
          .prepare('SELECT * FROM audio_attachments WHERE record_id = ? ORDER BY created_at DESC LIMIT 1')
          .get(recordId) as AudioAttachmentRow | undefined);

    return row ? mapAttachmentRow(row) : null;
  }

  private refreshRecordTranscript(recordId: string): void {
    const rows = this.db
      .prepare(`
        SELECT transcript_text, transcript_method
        FROM audio_attachments
        WHERE record_id = ? AND transcript_text IS NOT NULL AND transcript_text != ''
        ORDER BY transcript_updated_at DESC, created_at DESC
      `)
      .all(recordId) as Array<{ transcript_text: string; transcript_method: TranscriptMethod }>;

    const transcript = rows.map((row) => row.transcript_text).join('\n\n') || null;
    const transcriptMethod = rows[0]?.transcript_method ?? null;

    this.db
      .prepare(`
        UPDATE records
        SET transcript = @transcript, transcript_method = @transcriptMethod, updated_at = @updatedAt
        WHERE id = @recordId
      `)
      .run({
        transcript,
        transcriptMethod,
        updatedAt: new Date().toISOString(),
        recordId
      });
  }
}

function mapRow(row: RecordRow, audioAttachments: AudioAttachment[]): RecordItem {
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
    transcriptMethod: row.transcript_method,
    audioAttachments,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapAttachmentRow(row: AudioAttachmentRow): AudioAttachment {
  return {
    id: row.id,
    recordId: row.record_id,
    storagePath: row.storage_path,
    fileName: row.file_name,
    originalFileName: row.original_file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    durationSeconds: row.duration_seconds,
    transcriptId: row.transcript_id,
    transcriptText: row.transcript_text,
    transcriptMethod: row.transcript_method,
    transcriptCreatedAt: row.transcript_created_at,
    transcriptUpdatedAt: row.transcript_updated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

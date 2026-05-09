import { createSqliteConnection, type SqliteConnection } from './connection.js';
import { getEnv } from '../../config/env.js';

export function runMigrations(db: SqliteConnection): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      target_date TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      kind TEXT NOT NULL DEFAULT 'memo',
      tags_json TEXT NOT NULL DEFAULT '[]',
      category TEXT,
      project TEXT,
      transcript TEXT,
      owner_user_id TEXT NOT NULL DEFAULT 'local-user',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CHECK (kind IN ('memo', 'photo', 'audio', 'transcript', 'daily_report', 'monthly_report'))
    );

    CREATE TABLE IF NOT EXISTS photo_attachments (
      id TEXT PRIMARY KEY,
      record_id TEXT REFERENCES records(id) ON DELETE SET NULL,
      relative_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      caption TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_photo_attachments_record_id ON photo_attachments(record_id);
    CREATE INDEX IF NOT EXISTS idx_photo_attachments_relative_path ON photo_attachments(relative_path);

    CREATE VIRTUAL TABLE IF NOT EXISTS record_fts USING fts5(
      title,
      body,
      tags,
      category,
      project,
      transcript,
      content='records',
      content_rowid='rowid',
      tokenize='trigram'
    );

    CREATE TRIGGER IF NOT EXISTS records_ai AFTER INSERT ON records BEGIN
      INSERT INTO record_fts(rowid, title, body, tags, category, project, transcript)
      VALUES (new.rowid, new.title, new.body, new.tags_json, new.category, new.project, new.transcript);
    END;

    CREATE TRIGGER IF NOT EXISTS records_ad AFTER DELETE ON records BEGIN
      INSERT INTO record_fts(record_fts, rowid, title, body, tags, category, project, transcript)
      VALUES ('delete', old.rowid, old.title, old.body, old.tags_json, old.category, old.project, old.transcript);
    END;

    CREATE TRIGGER IF NOT EXISTS records_au AFTER UPDATE ON records BEGIN
      INSERT INTO record_fts(record_fts, rowid, title, body, tags, category, project, transcript)
      VALUES ('delete', old.rowid, old.title, old.body, old.tags_json, old.category, old.project, old.transcript);

      INSERT INTO record_fts(rowid, title, body, tags, category, project, transcript)
      VALUES (new.rowid, new.title, new.body, new.tags_json, new.category, new.project, new.transcript);
    END;
  `);

  ensureColumn(db, 'records', 'owner_user_id', "TEXT NOT NULL DEFAULT 'local-user'");
}

function ensureColumn(db: SqliteConnection, tableName: string, columnName: string, definition: string): void {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;

  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const db = createSqliteConnection(getEnv().dataDir);
  runMigrations(db);
  db.close();
  console.log('SQLite migrations completed.');
}

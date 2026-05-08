import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export type SqliteConnection = Database.Database;

export function createSqliteConnection(dataDir: string): SqliteConnection {
  fs.mkdirSync(dataDir, { recursive: true });

  const dbPath = path.join(dataDir, 'nippo.sqlite');
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  return db;
}

